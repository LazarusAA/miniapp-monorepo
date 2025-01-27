import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getXataClient } from "@/lib/utils";

/**
 * @swagger
 * /api/initiate-payment:
 *   post:
 *     summary: Initiate a new payment
 *     description: Creates a new payment record and links it to the user
 *     tags:
 *       - Payments
 *     security:
 *       - NextAuth: []
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The payment UUID
 *                   example: "a1b2c3d4e5f6g7h8i9j0"
 *       401:
 *         description: Unauthorized - User not authenticated
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const xata = getXataClient();
    
    // Get user record
    const user = await xata.db.Users.filter({ email: userEmail }).getFirst();
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Generate payment UUID
    const uuid = crypto.randomUUID().replace(/-/g, "");

    // Get the latest payment_id
    const latestPayment = await xata.db.Payments.sort('payment_id', 'desc').getFirst();
    const nextPaymentId = (latestPayment?.payment_id || 0) + 1;

    // Create payment record
    await xata.db.Payments.create({
      payment_id: nextPaymentId,
      uuid: uuid,
      user: user.xata_id
    });

    // Set cookie for frontend
    cookies().set({
      name: "payment-nonce",
      value: uuid,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 3600 // 1 hour expiry
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Payment nonce generated:', uuid);
    }

    return NextResponse.json({ id: uuid });

  } catch (error) {
    console.error("Error initiating payment:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
