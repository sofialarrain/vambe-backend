/**
 * Date utilities for the application
 * 
 * This module provides a simulated current date (November 2024)
 * to work with historical data from 2024.
 */

/**
 * Returns the simulated current date (November 15, 2024)
 * This allows the application to work with historical data from 2024
 * as if it were the current date.
 */
export const getSimulatedCurrentDate = (): Date => {
  return new Date(2024, 10, 15); // November 15, 2024 (month is 0-indexed)
};

/**
 * Returns the simulated current year (2024)
 */
export const getSimulatedCurrentYear = (): number => {
  return 2024;
};

/**
 * Returns the simulated current month (November = 10, 0-indexed)
 */
export const getSimulatedCurrentMonth = (): number => {
  return 10; // November (0-indexed)
};

