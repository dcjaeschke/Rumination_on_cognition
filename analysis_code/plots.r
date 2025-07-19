# ------------------------
# 1. Load and prepare data
# ------------------------

### a) Load data

trial_path <- "./data/nback.csv"
qnr_path   <- "./data/questionnaires.csv"

nback_df <- read_csv(trial_path, show_col_types = FALSE)
qnr_df   <- read_csv(qnr_path,   show_col_types = FALSE)

# Rename time_point for consistency with paper
names(nback_df)[names(nback_df) == "time_point"] <- "pre_post" 
names(nback_df)[names(nback_df) == "load"] <- "difficulty" 


### b) Merge & convert moderator labels

# Merge scores into df
qnr_scores <- qnr_df %>% select(ID, bdi_score, brood_score, rrs_score)
nback_df$ID <- as.character(nback_df$ID)
qnr_scores$ID <- as.character(qnr_df$ID)
df <- left_join(nback_df, qnr_scores, by = "ID")

# Create factor moderator labels based on scores
df <- df %>%
    mutate(
        MD_label    = as.factor(ifelse(bdi_score >= 14, 1, 0)),
        Brood_label = as.factor(ifelse(brood_score >= 11, 1, 0)),
        RRS_label   = as.factor(ifelse(rrs_score >= 24, 1, 0))
    )

# Diagnostics: count participants per category
cat("N MD high:    ", length(unique(df$ID[df$MD_label == 1])), "\n")
cat("N RRS high:   ", length(unique(df$ID[df$RRS_label == 1])), "\n")
cat("N Brood high: ", length(unique(df$ID[df$Brood_label == 1])), "\n")

# Convert moderator labels to factors 
df$MD_label <- as.factor(df$MD_label)
df$RRS_label <- as.factor(df$RRS_label)
df$Brood_label <- as.factor(df$Brood_label)

# -------------------------
# 2. Preprocess data
# -------------------------

# Log-transform RTs 
df$logRTs <- log(df$RTs)

# Filter IDs with mean Perf >= 50
valid_ids <- df %>%
    group_by(ID) %>%
    summarize(mean_perf = mean(Perf, na.rm = TRUE)) %>%
    filter(mean_perf >= 50) %>%
    pull(ID) 
df <- df %>% filter(ID %in% valid_ids)

# ------------------------
# 3. Aggregate by ID & timepoint (two data points per ID --> summary_df_two)
# ------------------------

summary_df_two <- df %>%
    group_by(ID, pre_post) %>%
    summarize(
        Perf = mean(Perf, na.rm = TRUE),
        CorrRejs = mean(CorrRejs, na.rm = TRUE),
        Hits = mean(Hits, na.rm = TRUE),
        EffRating = mean(EffRating, na.rm = TRUE),
        RTs = mean(RTs, na.rm = TRUE),
        group = first(group),
        MD_label = first(MD_label),
        Brood_label = first(Brood_label),
        RRS_label = first(RRS_label),
        bdi_score = first(bdi_score),
        brood_score = first(brood_score),
        rrs_score = first(rrs_score),
        .groups = "drop"
    )

# Z-score the continuous variables
summary_df_two <- summary_df_two %>%
    mutate(across(c(Perf, CorrRejs, Hits, EffRating, RTs), scale))

# Ensure categorical
summary_df_two$ID <- as.factor(summary_df_two$ID)
summary_df_two$group <- as.factor(summary_df_two$group)
summary_df_two$pre_post <- as.factor(summary_df_two$pre_post)

# Use summary_df as the main data for analysis
data <- summary_df_two


# ================================
# === RAW DATA PLOTTING 
# ================================

library(ggplot2)
library(dplyr)
library(RColorBrewer)
library(cowplot)
library(grid)
library(gridExtra)

# Custom colors and labels
rdylbu_colors <- brewer.pal(n = 8, name = "RdYlBu")
purd_colors <- brewer.pal(n = 8, name = "PuRd")

dependent_vars <- c("Perf", "RTs", "EffRating", "Hits", "CorrRejs")
dv_labels <- c("Perf" = "Performance", 
               "RTs" = "Reaction Time", 
               "EffRating" = "Effort Rating",
               "Hits" = "Hits",
               "CorrRejs" = "Correct Rejections")

theme_pub <- theme_minimal(base_size = 16) +
  theme(
    legend.position = "top",
    legend.title = element_text(size = 16),
    legend.text = element_text(size = 14),
    axis.title = element_text(size = 14),
    axis.text = element_text(size = 15),
    strip.text = element_text(size = 14),
    panel.grid.major = element_line(color = "grey90", size = 0.5),
    panel.grid.minor = element_blank(),
    panel.background = element_rect(fill = "white"),
    plot.title = element_text(size = 20, face = "bold", hjust = 0.5)
  )

plots_per_figure <- 3
interaction_plots <- list()

for (dv in dependent_vars) {

  data_summary <- data %>%
    group_by(pre_post, group) %>%
    summarise(
      mean_value = mean(!!sym(dv), na.rm = TRUE),
      se_value = sd(!!sym(dv), na.rm = TRUE) / sqrt(n()),
      .groups = "drop"
    )
  
  interaction_plot <- ggplot(data_summary, aes(x = pre_post, y = mean_value, color = group, group = group)) +
    geom_line(size = 1.0) +
    geom_point(size = 2) +
    geom_errorbar(aes(ymin = mean_value - 2 * se_value, ymax = mean_value + 2 * se_value),
                  width = 0.2, size = 0.8) +
    scale_color_manual(values = c("tomato2", "royalblue2"), labels = c("RUM", "NEU")) +
    scale_x_discrete(labels = c("Pre" = "Pre", "Post" = "Post")) +
    ylim(-0.4, 0.45) +
    labs(x = "", y = paste(dv_labels[dv], "(z-scored)"), color = "Group") +
    theme_pub +
    theme(legend.position = "none")
  
  interaction_plots[[dv]] <- interaction_plot
}

# Group and plot with legend
interaction_chunks <- split(interaction_plots, ceiling(seq_along(interaction_plots) / plots_per_figure))
legend <- get_legend(
  interaction_plots[[1]] +
    theme(legend.position = "right")
)

library(patchwork)

plot_group_1 <- interaction_plots[["Perf"]] +
  interaction_plots[["RTs"]] +
  interaction_plots[["EffRating"]] +
  plot_layout(ncol = 3, guides = "collect") +
  plot_annotation(tag_levels = 'a') &
  theme(legend.position = "right")

print(plot_group_1)
ggsave("plots/interaction_group1.png", plot = plot_group_1, width = 12, height = 4, dpi = 300)

# Combine the other two plots
plot_group_2 <- interaction_plots[["Hits"]] +
  interaction_plots[["CorrRejs"]] +
  plot_layout(ncol = 2, guides = "collect") +
  plot_annotation(tag_levels = 'a') &
  theme(legend.position = "right")

print(plot_group_2)
ggsave("plots/interaction_group2.png", plot = plot_group_2, width = 8, height = 4, dpi = 300)

plots_per_figure <- 2
bdi_plots <- list()
bdi_cutoffs <- c(0, 14, Inf)
bdi_labels <- c("Low (0-13)", "High (14+)")
data$bdi_category <- cut(data$bdi_score, breaks = bdi_cutoffs, labels = bdi_labels, include.lowest = TRUE)

for (dv in dependent_vars) {

  data_summary <- data %>%
    group_by(pre_post, group, bdi_category) %>%
    summarise(
      mean_value = mean(!!sym(dv), na.rm = TRUE),
      se_value = sd(!!sym(dv), na.rm = TRUE) / sqrt(n()),
      .groups = "drop"
    )
  
  bdi_plot <- ggplot(data_summary, aes(x = pre_post, y = mean_value, color = group, group = group)) +
    geom_line(size = 1.0) +
    geom_point(size = 2) +
    geom_errorbar(aes(ymin = mean_value - 2 * se_value, ymax = mean_value + 2 * se_value),
                  width = 0.2, size = 0.8) +
    scale_color_manual(values = c("tomato2", "royalblue2"), labels = c("RUM", "NEU")) +
    scale_x_discrete(labels = c("Pre" = "Pre", "Post" = "Post")) +
    ylim(-0.65, 0.65) +
    labs(x = "", y = paste(dv_labels[dv], "(z-scored)"), color = "Group") +
    facet_wrap(~ bdi_category) +
    theme_pub +
    theme(strip.background = element_rect(fill = "grey95", color = "black"))
  
  bdi_plots[[dv]] <- bdi_plot
}

plot_group_1 <- bdi_plots[["Perf"]] +
  bdi_plots[["EffRating"]] +
  plot_layout(ncol = 2, guides = "collect") +
  plot_annotation(tag_levels = 'a') &
  theme(legend.position = "right")

# Uncomment to print if needed
#print(plot_group_1)
#ggsave("plots/bdi_perf_effrating.png", plot = plot_group_1, width = 8, height = 4, dpi = 300)

rrs_plots <- list()
rrs_cutoffs <- c(0, 24, Inf)
rrs_labels <- c("Low (0-23)", "High (24+)")
data$rrs_category <- cut(data$rrs_score, breaks = rrs_cutoffs, labels = rrs_labels, include.lowest = TRUE)

for (dv in dependent_vars) {

  data_summary <- data %>%
    group_by(pre_post, group, rrs_category) %>%
    summarise(
      mean_value = mean(!!sym(dv), na.rm = TRUE),
      se_value = sd(!!sym(dv), na.rm = TRUE) / sqrt(n()),
      .groups = "drop"
    )
  
  rrs_plot <- ggplot(data_summary, aes(x = pre_post, y = mean_value, color = group, group = group)) +
    geom_line(size = 1.0) +
    geom_point(size = 2) +
    geom_errorbar(aes(ymin = mean_value - 2 * se_value, ymax = mean_value + 2 * se_value),
                  width = 0.2, size = 0.8) +
    scale_color_manual(values = c("tomato2", "royalblue2"), labels = c("RUM", "NEU")) +
    scale_x_discrete(labels = c("Pre" = "Pre", "Post" = "Post")) +
    ylim(-0.65, 0.65) +
    labs(x = "", y = paste(dv_labels[dv], "(z-scored)"), color = "Group") +
    facet_wrap(~ rrs_category) +
    theme_pub +
    theme(strip.background = element_rect(fill = "grey95", color = "black"))
  
  rrs_plots[[dv]] <- rrs_plot
}

plot_group_1 <- bdi_plots[["Perf"]] +
  bdi_plots[["EffRating"]] +
  rrs_plots[["Perf"]] +
  rrs_plots[["EffRating"]] +
  plot_layout(ncol = 2, guides = "collect") +
  plot_annotation(tag_levels = 'a') &
  theme(legend.position = "right")

print(plot_group_1)
ggsave("plots/bdi_rrs_perf_effrating.png", plot = plot_group_1, width = 12, height = 8, dpi = 300)
