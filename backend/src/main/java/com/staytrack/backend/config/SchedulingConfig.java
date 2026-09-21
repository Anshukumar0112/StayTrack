package com.staytrack.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables Spring scheduled jobs used for backend recovery tasks.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
