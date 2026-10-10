
import { MenuItem, Order, MealType, CanteenConfig, OrderStatus, Feedback, GeneralFeedback } from '../types';
import { dbService } from './dbService';

const T_MENU = 'canteen_menu';
const T_ORDERS = 'canteen_orders';
const T_FEEDBACK = 'canteen_feedback';
const T_GENERAL_FEEDBACK = 'canteen_general_feedback';
const K_CONFIG = 'canteen_config';

export const canteenService = {
  getConfig: (): CanteenConfig => {
    const saved = localStorage.getItem(K_CONFIG);
    const menu = dbService.getTable<MenuItem>(T_MENU);
    if (saved) {
      const config = JSON.parse(saved);
      return { ...config, menu };
    }
    return {
      isOrderingOpen: { Breakfast: true, Lunch: true, Dinner: true },
      menu
    };
  },

  // Fix: Updated saveConfig to handle full CanteenConfig including menu persistence
  // This resolves type errors where menu was being passed to an Omit type
  saveConfig: (config: CanteenConfig) => {
    const { menu, ...rest } = config;
    localStorage.setItem(K_CONFIG, JSON.stringify(rest));
    if (menu) {
      dbService.saveTable(T_MENU, menu);
    }
  },

  getOrders: (): Order[] => dbService.getTable<Order>(T_ORDERS),

  hasOrderedForSlot: (userEmail: string, type: MealType): boolean => {
    const orders = canteenService.getOrders();
    const today = new Date().toDateString();
    return orders.some(o => 
      o.studentEmail === userEmail && 
      o.type === type && 
      (o.status === 'Pending' || (o.status === 'Served' && !o.feedbackSubmitted)) &&
      new Date(o.timestamp).toDateString() === today
    );
  },

  placeOrder: (studentId: string, userEmail: string, cartItems: { name: string; quantity: number }[], type: MealType): Order => {
    const menu = dbService.getTable<MenuItem>(T_MENU);
    
    // Calculate total based on current menu prices
    const total = cartItems.reduce((acc, cartItem) => {
      const menuItem = menu.find(m => m.name === cartItem.name);
      return acc + ((menuItem?.price || 0) * cartItem.quantity);
    }, 0);

    const orderId = `${type.charAt(0)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      id: orderId,
      studentId,
      studentEmail: userEmail,
      studentName: userEmail.split('@')[0],
      items: cartItems,
      total,
      status: 'Pending',
      timestamp: Date.now(),
      type,
      feedbackSubmitted: false
    };

    dbService.addRow(T_ORDERS, newOrder);
    return newOrder;
  },

  cancelOrder: (orderId: string, reason: string) => {
    dbService.updateRow<Order>(T_ORDERS, orderId, { status: 'Cancelled', cancelReason: reason });
  },

  updateOrderItems: (orderId: string, items: { name: string; quantity: number }[]) => {
    const menu = dbService.getTable<MenuItem>(T_MENU);
    const total = items.reduce((acc, cartItem) => {
      const menuItem = menu.find(m => m.name === cartItem.name);
      return acc + ((menuItem?.price || 0) * cartItem.quantity);
    }, 0);
    dbService.updateRow<Order>(T_ORDERS, orderId, { items, total });
  },

  updateOrderStatus: (orderId: string, status: OrderStatus, reason?: string) => {
    const updates: Partial<Order> = { status };
    if (status === 'Served') {
      updates.servedTimestamp = Date.now();
      // Notify the student their order is ready
      const orders = dbService.getTable<Order>(T_ORDERS);
      const order = orders.find(o => o.id === orderId);
      if (order) {
        dbService.pushNotification(
          order.studentEmail,
          'food_served',
          'Your order is ready',
          `Your ${order.type} order has been served at the canteen.`,
          orderId
        );
      }
    }
    if (status === 'Expired' && reason) {
      updates.declineReason = reason;
    }
    dbService.updateRow<Order>(T_ORDERS, orderId, updates);
  },

  submitFeedback: (feedback: Feedback) => {
    dbService.addRow(T_FEEDBACK, feedback);
    dbService.updateRow<Order>(T_ORDERS, feedback.orderId, { feedbackSubmitted: true });
  },

  getAllFeedback: (): Feedback[] => dbService.getTable<Feedback>(T_FEEDBACK),

  submitGeneralFeedback: (feedback: Omit<GeneralFeedback, 'id' | 'timestamp'>) => {
    const newEntry: GeneralFeedback = {
      ...feedback,
      id: `GEN-${Date.now()}`,
      timestamp: Date.now()
    };
    dbService.addRow(T_GENERAL_FEEDBACK, newEntry);
  },

  getAllGeneralFeedback: (): GeneralFeedback[] => dbService.getTable<GeneralFeedback>(T_GENERAL_FEEDBACK)
};
