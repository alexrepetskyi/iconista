import { cookies } from 'next/headers';
import { connectDb } from '@/lib/mongodb';
import { Cart } from '@/models/Cart';
import { Order } from '@/models/Order';
import { User } from '@/models/User';
import { mergeProductIds } from '@/features/cart/merge';
import { CART_SESSION_COOKIE } from '@/features/cart/session';

/**
 * First-login housekeeping:
 *  - merge the anonymous cookie cart into the user's cart;
 *  - attach past guest orders with the user's (verified) email to the account.
 * Never throws — login must not fail over cart glue.
 */
export async function linkGuestData(userId: string, email: string): Promise<void> {
  try {
    await connectDb();

    const sessionId = (await cookies()).get(CART_SESSION_COOKIE)?.value;
    if (sessionId) {
      const guestCart = await Cart.findOne({ sessionId });
      if (guestCart && guestCart.productIds.length > 0) {
        const userCart = await Cart.findOne({ userId });
        if (userCart) {
          userCart.productIds = mergeProductIds(
            userCart.productIds.map(String),
            guestCart.productIds.map(String),
          ) as never;
          await userCart.save();
          await guestCart.deleteOne();
        } else {
          guestCart.sessionId = undefined as never;
          guestCart.userId = userId as never;
          await guestCart.save();
        }
      }
    }

    if (email) {
      const user = await User.findById(userId);
      // Only claim guest orders once the address is proven to belong to them.
      if (user?.emailVerifiedAt) {
        await Order.updateMany(
          { email: email.toLowerCase(), userId: { $exists: false } },
          { $set: { userId } },
        );
      }
    }
  } catch (err) {
    console.error('linkGuestData failed', err);
  }
}
