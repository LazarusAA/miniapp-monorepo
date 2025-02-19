import { getXataClient } from "@/lib/utils";
import { NextResponse } from "next/server";

interface PriceResponse {
  amount?: number;
  error?: string;
}

/**
 * @swagger
 * /api/fetch-pay-amount:
 *   get:
 *     summary: Get subscription price amount
 *     description: Retrieves the current subscription price in WORLD tokens
 *     tags:
 *       - Payments
 *     responses:
 *       200:
 *         description: Successfully retrieved subscription price
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 amount:
 *                   type: number
 *                   format: float
 *                   example: 3.5
 *       404:
 *         description: Price not found
 *       500:
 *         description: Internal server error
 */
export async function GET() {
  try {
    const xata = getXataClient();

    // Get the subscription price
    const priceRecord = await xata.db.SubscriptionPrice.getFirst();

    if (!priceRecord) {
      const response: PriceResponse = { error: "Price not found" };
      return NextResponse.json(response, { status: 404 });
    }

    const response: PriceResponse = {
      amount: priceRecord.world_amount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching subscription price:", error);
    const response: PriceResponse = {
      error: "Failed to fetch subscription price",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
