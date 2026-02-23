import cron from "node-cron";
import supabase from "../config/supabase.js";
import { logger } from "../utils/logger.js";

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
// Auto-batch cron job
export const startAutoBatchCron = () => {
  // Run every 1 minute: "*/1 * * * *"
  cron.schedule("*/1 * * * *", async () => {
    try {
      logger.info("🔄 Auto-batch cron job started");

      // Get all pending deliveries without batches
      const { data: pendingDeliveries, error: fetchError } = await supabase
        .from("deliveries")
        .select("*")
        .eq("status", "pending")
        .is("batch_id", null);

      if (fetchError) {
        logger.error("Cron: Failed to fetch deliveries", {
          error: fetchError.message,
        });
        return;
      }

      const count = pendingDeliveries?.length || 0;
      logger.info("📦 Cron: Found pending deliveries", { count });

      if (count < 1) {
        logger.debug("⏳ Cron: No pending deliveries");
        return;
      }

      let deliveriesAdded = 0;
      let batchesCreated = 0;
      const processed = new Set();

      // First pass: Add pending deliveries to existing nearby batches
      // First pass: Add pending deliveries to existing nearby batches
      for (const delivery of pendingDeliveries) {
        if (!delivery.latitude || !delivery.longitude) continue;
        if (processed.has(delivery.id)) continue;

        try {
          // Find ALL existing batches with status 'created'
          const { data: existingBatches, error: batchFetchError } =
            await supabase.from("batches").select("id").eq("status", "created");

          if (
            batchFetchError ||
            !existingBatches ||
            existingBatches.length === 0
          ) {
            continue;
          }

          // Check each existing batch to see if delivery is nearby
          let addedToBatch = false;

          for (const batch of existingBatches) {
            // Get deliveries in this batch
            const { data: batchDeliveries, error: bdError } = await supabase
              .from("deliveries")
              .select("latitude, longitude")
              .eq("batch_id", batch.id)
              .limit(1);

            if (bdError || !batchDeliveries || batchDeliveries.length === 0) {
              continue;
            }

            // Check distance to any delivery in batch
            for (const batchDelivery of batchDeliveries) {
              const distance = getDistance(
                delivery.latitude,
                delivery.longitude,
                batchDelivery.latitude,
                batchDelivery.longitude,
              );

              // If within 1km of existing batch, add to it
              if (distance <= 1) {
                const { error: updateError } = await supabase
                  .from("deliveries")
                  .update({ batch_id: batch.id })
                  .eq("id", delivery.id);

                if (!updateError) {
                  logger.info("➕ Cron: Added delivery to existing batch", {
                    deliveryId: delivery.id,
                    batchId: batch.id,
                    distance: distance.toFixed(2),
                  });
                  deliveriesAdded++;
                  processed.add(delivery.id);
                  addedToBatch = true;
                  break;
                }
              }
            }

            if (addedToBatch) break;
          }
        } catch (error) {
          logger.error("Cron: Error checking existing batches", {
            error: error.message,
          });
        }
      }

      // Second pass: Create new batches for remaining pending deliveries
      for (const delivery of pendingDeliveries) {
        if (!delivery.latitude || !delivery.longitude) continue;
        if (processed.has(delivery.id)) continue;

        const cluster = [delivery];
        processed.add(delivery.id);

        // Find nearby deliveries (within 1km, max 10)
        for (const other of pendingDeliveries) {
          if (cluster.length >= 10) break; // Max 10 per batch
          if (!other.latitude || !other.longitude) continue;
          if (processed.has(other.id)) continue;

          const distance = getDistance(
            delivery.latitude,
            delivery.longitude,
            other.latitude,
            other.longitude,
          );

          if (distance <= 1) {
            cluster.push(other);
            processed.add(other.id);
          }
        }

        // Only create batch if we have 3+ deliveries
        if (cluster.length >= 3) {
          try {
            // Get best available rider
            const { data: riders, error: ridersError } = await supabase
              .from("riders")
              .select("*")
              .order("average_rating", { ascending: false })
              .limit(1);

            if (ridersError || !riders || riders.length === 0) {
              logger.warn("Cron: No available riders");
              continue;
            }

            const rider = riders[0];

            // Create batch
            const { data: newBatch, error: batchError } = await supabase
              .from("batches")
              .insert([
                {
                  rider_id: rider.id,
                  status: "created",
                  total_deliveries: cluster.length,
                },
              ])
              .select();

            if (batchError) {
              logger.error("Cron: Batch creation failed", {
                error: batchError.message,
              });
              continue;
            }

            const batchId = newBatch[0].id;
            const deliveryIds = cluster.map((d) => d.id);

            // Link deliveries to batch
            const { error: linkError } = await supabase
              .from("deliveries")
              .update({ batch_id: batchId })
              .in("id", deliveryIds);

            if (linkError) {
              logger.error("Cron: Failed to link deliveries", {
                error: linkError.message,
              });
              continue;
            }

            logger.info("✅ Cron: New batch created", {
              batchId,
              deliveriesCount: cluster.length,
              riderName: rider.name,
            });

            batchesCreated++;
          } catch (error) {
            logger.error("Cron: Error creating batch", {
              error: error.message,
            });
          }
        }
      }

      if (deliveriesAdded > 0 || batchesCreated > 0) {
        logger.info("✅ Cron job completed", {
          deliveriesAdded,
          batchesCreated,
        });
      }
    } catch (error) {
      logger.error("❌ Cron job error", { error: error.message });
    }
  });

  logger.info(
    "✅ Auto-batch cron job started (runs every 1 minute, max 10 per batch)",
  );
};
