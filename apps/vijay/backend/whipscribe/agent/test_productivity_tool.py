"""
Unit Tests for Productivity & Budget Tool with Currency Normalization.
"""

import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from whipscribe.agent.tools import (
    normalize_currency_to_usd,
    calculate_productivity_factor,
    calculate_task_productivity_and_quote,
    CalculateProductivityAndBudgetTool,
    ToolRegistry,
)


class TestProductivityAndBudgetTool(unittest.TestCase):

    def test_currency_normalization(self):
        # 1 USD = 90 INR as requested
        usd_amount = normalize_currency_to_usd(4500, "INR")
        self.assertAlmostEqual(usd_amount, 50.0, places=1)

        usd_from_usd = normalize_currency_to_usd(50, "USD")
        self.assertEqual(usd_from_usd, 50.0)

        usd_from_eur = normalize_currency_to_usd(92, "EUR")
        self.assertAlmostEqual(usd_from_eur, 100.0, places=1)

    def test_productivity_factor_scaling(self):
        # Baseline $50 USD -> 1.0x
        factor_50 = calculate_productivity_factor(50.0)
        self.assertEqual(factor_50, 1.0)

        # Senior freelancer $100 USD -> ~1.41x (faster, tasks take fewer hours)
        factor_100 = calculate_productivity_factor(100.0)
        self.assertAlmostEqual(factor_100, 1.41, places=2)

        # Junior freelancer $25 USD -> ~0.71x (slower, tasks take more hours)
        factor_25 = calculate_productivity_factor(25.0)
        self.assertAlmostEqual(factor_25, 0.71, places=2)

    def test_task_time_and_quote_estimation(self):
        sample_tasks = [
            {"id": "t1", "title": "Setup database", "effort": "S"},       # Base 2.0h
            {"id": "t2", "title": "Build API endpoints", "effort": "M"},  # Base 5.0h
            {"id": "t3", "title": "Design UI dashboard", "effort": "L"},  # Base 12.0h
        ]  # Total base = 19.0h

        # Baseline freelancer at $50/hr USD
        quote_baseline = calculate_task_productivity_and_quote(
            tasks=sample_tasks,
            hourly_rate=50.0,
            currency="USD",
            budget=1000.0,
        )
        self.assertEqual(quote_baseline.productivity_factor, 1.0)
        self.assertEqual(quote_baseline.normalized_rate_usd, 50.0)
        self.assertEqual(quote_baseline.total_hours, 19.0)
        self.assertEqual(quote_baseline.total_price, 950.0)
        self.assertEqual(quote_baseline.budget_status, "within_budget")

        # Freelancer in India charging ₹4500/hr (normalized = $50 USD/hr)
        quote_inr = calculate_task_productivity_and_quote(
            tasks=sample_tasks,
            hourly_rate=4500.0,
            currency="INR",
            budget=90000.0,
        )
        self.assertEqual(quote_inr.normalized_rate_usd, 50.0)
        self.assertEqual(quote_inr.productivity_factor, 1.0)
        self.assertEqual(quote_inr.total_hours, 19.0)
        self.assertEqual(quote_inr.total_price, 85500.0)
        self.assertEqual(quote_inr.budget_status, "within_budget")

        # Senior freelancer charging $100/hr USD -> faster efficiency (productivity ~1.41x)
        quote_senior = calculate_task_productivity_and_quote(
            tasks=sample_tasks,
            hourly_rate=100.0,
            currency="USD",
            budget=1000.0,
        )
        self.assertGreater(quote_senior.productivity_factor, 1.0)
        self.assertLess(quote_senior.total_hours, 19.0)  # Should complete in fewer hours!
        self.assertEqual(quote_senior.budget_status, "exceeds_budget")  # $100/hr x ~13.5h = $1350 > $1000

    def test_tool_registry_integration(self):
        registry = ToolRegistry()
        tool = registry.get_tool("calculate_productivity_and_budget")
        self.assertIsNotNone(tool)

        res = registry.execute_tool(
            "calculate_productivity_and_budget",
            tasks=[{"title": "Calendar sync", "effort": "M"}],
            hourly_rate=4500.0,
            currency="INR",
            budget=50000.0,
        )
        self.assertTrue(res.success)
        self.assertEqual(res.data["currency"], "INR")
        self.assertEqual(res.data["normalized_rate_usd"], 50.0)


if __name__ == "__main__":
    unittest.main()
