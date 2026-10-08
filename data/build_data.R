# =============================================================================
# Learning Claude Code: practice dataset
# Run once from the repo root:  Rscript data/build_data.R
# Writes data/trips.csv, a small synthetic ride-share trip table that every
# drill edits through Claude Code. No real data, no real company.
# =============================================================================
set.seed(20261008)

n       <- 5000
cities  <- c("Austin", "Denver", "Portland", "Raleigh")
drivers <- sprintf("D%04d", 1:300)
riders  <- sprintf("R%05d", 1:2000)

start <- as.POSIXct("2026-09-01 00:00:00", tz = "UTC")
pickup <- start + runif(n, 0, 30 * 24 * 3600)

city      <- sample(cities, n, replace = TRUE, prob = c(0.35, 0.3, 0.2, 0.15))
distance  <- round(rlnorm(n, meanlog = 1.3, sdlog = 0.6), 2)        # km
base_fare <- c(Austin = 2.5, Denver = 2.8, Portland = 2.6, Raleigh = 2.2)[city]
surge     <- ifelse(format(pickup, "%H") %in% c("17", "18", "19"),
                    round(runif(n, 1.2, 2.0), 1), 1.0)
fare      <- round((base_fare + 1.1 * distance) * surge, 2)
rating    <- sample(1:5, n, replace = TRUE, prob = c(0.02, 0.03, 0.08, 0.27, 0.60))

trips <- data.frame(
  trip_id   = sprintf("T%06d", seq_len(n)),
  driver_id = sample(drivers, n, replace = TRUE),
  rider_id  = sample(riders,  n, replace = TRUE),
  city      = city,
  pickup_ts = format(pickup, "%Y-%m-%d %H:%M:%S"),
  distance_km = distance,
  surge     = surge,
  fare_usd  = fare,
  rating    = rating,
  stringsAsFactors = FALSE
)

# A handful of deliberately bad rows, so verification drills have
# something to catch: a negative distance, a zero fare, a rating of 6.
trips$distance_km[17] <- -1.4
trips$fare_usd[203]   <- 0
trips$rating[999]     <- 6L

dir.create("data", showWarnings = FALSE)
write.csv(trips, "data/trips.csv", row.names = FALSE)
cat("Wrote data/trips.csv:", nrow(trips), "rows\n")
