# =============================================================================
# trip_metrics.R: the script every drill asks Claude Code to change.
# Run:  Rscript data/trip_metrics.R
# Prints one row per city: trips, mean fare, mean distance, share rated 5.
# =============================================================================
suppressPackageStartupMessages(library(dplyr))

trips <- read.csv("data/trips.csv", stringsAsFactors = FALSE)

metrics <- trips |>
  group_by(city) |>
  summarise(
    trips      = n(),
    mean_fare  = round(mean(fare_usd), 2),
    mean_km    = round(mean(distance_km), 2),
    share_five = round(mean(rating == 5), 3),
    .groups = "drop"
  ) |>
  arrange(desc(trips))

print(as.data.frame(metrics))
