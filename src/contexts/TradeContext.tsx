import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
// Using direct CDN import for Socket.IO client to avoid bundling issues
declare global {
  interface Window {
    io: typeof import('socket.io-client').io;
  }
}
const io = window.io;
import axios from 'axios';

export interface TradeOffer {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  offerPrice: number;
  originalPrice: number;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  
  // Trade details
  tradeDetails: {
    duration: string; // e.g., "3 months remaining"
    accessType: 'transfer' | 'share'; // transfer ownership or share access
    credentials?: {
      username?: string;
      email?: string;
      password?: string;
      additionalInfo?: string;
    };
  };
  
  // Security features
  escrowStatus: 'none' | 'held' | 'released';
  verificationRequired: boolean;
  tradeProtectionLevel: 'basic' | 'premium';
}

export interface TradeNotification {
  id: string;
  userId: string;
  type: 'offer_received' | 'offer_accepted' | 'offer_declined' | 'trade_completed' | 'trade_expired';
  tradeId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface TradeContextType {
  // Trade offers
  pendingOffers: TradeOffer[];
  sentOffers: TradeOffer[];
  completedTrades: TradeOffer[];
  
  // Notifications
  notifications: TradeNotification[];
  unreadCount: number;
  
  // Actions
  sendTradeOffer: (offer: Omit<TradeOffer, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'status' | 'escrowStatus'>) => Promise<void>;
  acceptTradeOffer: (tradeId: string) => Promise<void>;
  declineTradeOffer: (tradeId: string, reason?: string) => Promise<void>;
  cancelTradeOffer: (tradeId: string) => Promise<void>;
  completeTrade: (tradeId: string, credentials: Credentials | undefined) => Promise<void>;
  
  // Utility functions
  getTradeById: (tradeId: string) => TradeOffer | null;
  getUserTradeHistory: (userId: string) => TradeOffer[];
  markNotificationAsRead: (notificationId: string) => void;
  
  // Trade restrictions
  canUserTrade: (userId: string) => boolean;
  getTradeTimeRemaining: (userId: string) => number; // cooldown in minutes
  
  isLoading: boolean;
}

const TradeContext = createContext<TradeContextType | undefined>(undefined);

export const useTrade = () => {
  const context = useContext(TradeContext);
  if (context === undefined) {
    throw new Error('useTrade must be used within a TradeProvider');
  }
  return context;
};

interface TradeProviderProps {
  children: ReactNode;
}

export const TradeProvider: React.FC<TradeProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [pendingOffers, setPendingOffers] = useState<TradeOffer[]>([]);
  const [sentOffers, setSentOffers] = useState<TradeOffer[]>([]);
  const [completedTrades, setCompletedTrades] = useState<TradeOffer[]>([]);
  const [notifications, setNotifications] = useState<TradeNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tradeCooldowns, setTradeCooldowns] = useState<Record<string, Date>>({});
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to socket server with auth token
      const token = localStorage.getItem('serviceswap_token');
      const newSocket = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      });

      setSocket(newSocket);

      // Socket event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected');
        fetchTradeData();
      });

      newSocket.on('new_trade_offer', (trade: BackendTrade) => {
        // Map backend trade to frontend TradeOffer format
        const newOffer = mapTradeToTradeOffer(trade);
        setPendingOffers(prev => [...prev, newOffer]);
        
        // Create notification
        const notification: TradeNotification = {
          id: `notif_${Date.now()}`,
          userId: user.id,
          type: 'offer_received',
          tradeId: trade._id,
          message: `New trade offer from ${trade.fromUser.name} for ${trade.service.title}`,
          read: false,
          createdAt: new Date()
        };
        
        setNotifications(prev => [...prev, notification]);
      });

      newSocket.on('trade_accepted', (trade: BackendTrade) => {
        const updatedOffer = mapTradeToTradeOffer(trade);
        
        // Update sent offers
        setSentOffers(prev => prev.map(offer => 
          offer.id === trade._id ? updatedOffer : offer
        ));
        
        // Create notification
        const notification: TradeNotification = {
          id: `notif_${Date.now()}`,
          userId: user.id,
          type: 'offer_accepted',
          tradeId: trade._id,
          message: `Your trade offer for ${trade.service.title} was accepted`,
          read: false,
          createdAt: new Date()
        };
        
        setNotifications(prev => [...prev, notification]);
      });

      newSocket.on('trade_declined', (trade: BackendTrade) => {
        const updatedOffer = mapTradeToTradeOffer(trade);
        
        // Update sent offers
        setSentOffers(prev => prev.map(offer => 
          offer.id === trade._id ? updatedOffer : offer
        ));
        
        // Create notification
        const notification: TradeNotification = {
          id: `notif_${Date.now()}`,
          userId: user.id,
          type: 'offer_declined',
          tradeId: trade._id,
          message: `Your trade offer for ${trade.service.title} was declined`,
          read: false,
          createdAt: new Date()
        };
        
        setNotifications(prev => [...prev, notification]);
      });

      newSocket.on('trade_cancelled', (trade: BackendTrade) => {
        const updatedOffer = mapTradeToTradeOffer(trade);
        
        // Update pending offers
        setPendingOffers(prev => prev.map(offer => 
          offer.id === trade._id ? updatedOffer : offer
        ));
        
        // Create notification
        const notification: TradeNotification = {
          id: `notif_${Date.now()}`,
          userId: user.id,
          type: 'offer_declined',
          tradeId: trade._id,
          message: `Trade offer for ${trade.service.title} was cancelled`,
          read: false,
          createdAt: new Date()
        };
        
        setNotifications(prev => [...prev, notification]);
      });

      newSocket.on('trade_completed', (trade: BackendTrade) => {
        const updatedOffer = mapTradeToTradeOffer(trade);
        
        // Remove from pending/sent and add to completed
        setPendingOffers(prev => prev.filter(offer => offer.id !== trade._id));
        setSentOffers(prev => prev.filter(offer => offer.id !== trade._id));
        setCompletedTrades(prev => [...prev, updatedOffer]);
        
        // Create notification
        const notification: TradeNotification = {
          id: `notif_${Date.now()}`,
          userId: user.id,
          type: 'trade_completed',
          tradeId: trade._id,
          message: `Trade for ${trade.service.title} was completed successfully`,
          read: false,
          createdAt: new Date()
        };
        
        setNotifications(prev => [...prev, notification]);
      });

      // Cleanup on unmount
      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, user]);

  // Helper function to map backend trade to frontend TradeOffer format
  interface BackendUser { _id: string; name?: string }
  interface BackendService { _id: string; title?: string; category?: string }
  interface Credentials { username?: string; email?: string; password?: string; additionalInfo?: string }
  interface BackendTrade {
    _id: string;
    fromUser: BackendUser | string;
    toUser: BackendUser | string;
    service: BackendService | string;
    offerPrice: number;
    originalPrice: number;
    message?: string;
    status: 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled' | 'expired';
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    acceptedAt?: string;
    completedAt?: string;
    tradeDetails?: { duration?: string; accessType?: 'transfer' | 'share'; credentials?: Credentials };
    escrowStatus?: 'none' | 'held' | 'released';
    verificationRequired?: boolean;
    tradeProtectionLevel?: 'basic' | 'premium';
  }

  const mapTradeToTradeOffer = (trade: BackendTrade): TradeOffer => {
    return {
      id: trade._id,
      fromUserId: trade.fromUser._id || trade.fromUser,
      fromUserName: trade.fromUser.name || 'Unknown User',
      toUserId: trade.toUser._id || trade.toUser,
      toUserName: trade.toUser.name || 'Unknown User',
      serviceId: trade.service._id || trade.service,
      serviceName: trade.service.title || 'Unknown Service',
      serviceCategory: trade.service.category || 'Other',
      offerPrice: trade.offerPrice,
      originalPrice: trade.originalPrice,
      message: trade.message,
      status: trade.status,
      createdAt: new Date(trade.createdAt),
      updatedAt: new Date(trade.updatedAt),
      expiresAt: new Date(trade.expiresAt),
      acceptedAt: trade.acceptedAt ? new Date(trade.acceptedAt) : undefined,
      completedAt: trade.completedAt ? new Date(trade.completedAt) : undefined,
      tradeDetails: trade.tradeDetails || {
        duration: 'Not specified',
        accessType: 'share'
      },
      escrowStatus: trade.escrowStatus || 'none',
      verificationRequired: trade.verificationRequired || false,
      tradeProtectionLevel: trade.tradeProtectionLevel || 'basic'
    };
  };

  // Fetch trade data from API
  const fetchTradeData = async () => {
    if (!user) return;
    const token = localStorage.getItem('serviceswap_token');
    if (!token) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.get('/api/trades', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const trades = response.data;
      
      // Process trades into appropriate categories
      const pending: TradeOffer[] = [];
      const sent: TradeOffer[] = [];
      const completed: TradeOffer[] = [];
      
      trades.forEach((trade: any) => {
        const tradeOffer = mapTradeToTradeOffer(trade);
        
        if (trade.status === 'completed') {
          completed.push(tradeOffer);
        } else if (trade.fromUser._id === user.id || trade.fromUser === user.id) {
          sent.push(tradeOffer);
        } else {
          pending.push(tradeOffer);
        }
      });
      
      setPendingOffers(pending);
      setSentOffers(sent);
      setCompletedTrades(completed);
      
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Token invalid/expired; gracefully skip updating state
        return;
      }
      console.error('Error fetching trades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTradeOffer = async (offerData: Omit<TradeOffer, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt' | 'status' | 'escrowStatus'>): Promise<void> => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await axios.post('/api/trades', {
        serviceId: offerData.serviceId,
        offerPrice: offerData.offerPrice,
        message: offerData.message,
        tradeDetails: offerData.tradeDetails
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('serviceswap_token')}`
        }
      });
      
      const newTrade = response.data;
      const newOffer = mapTradeToTradeOffer(newTrade);
      
      setSentOffers(prev => [...prev, newOffer]);
      
      // Set cooldown
      setTradeCooldowns(prev => ({
        ...prev,
        [user.id]: new Date(Date.now() + 5 * 60 * 1000) // 5 minute cooldown
      }));
      
    } catch (error) {
      console.error('Error sending trade offer:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptTradeOffer = async (tradeId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await axios.put(`/api/trades/${tradeId}/accept`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('serviceswap_token')}`
        }
      });
      
      const updatedTrade = response.data;
      const updatedOffer = mapTradeToTradeOffer(updatedTrade);
      
      // Update pending offers
      setPendingOffers(prev => prev.filter(offer => offer.id !== tradeId));
      
      // Socket will handle the notification
      
      // Add notification
      const offer = pendingOffers.find(o => o.id === tradeId);
      if (offer) {
        setNotifications(prev => [...prev, {
          id: `notif_${Date.now()}`,
          userId: offer.fromUserId,
          type: 'offer_accepted',
          tradeId,
          message: `${offer.toUserName} accepted your trade offer for ${offer.serviceName}`,
          read: false,
          createdAt: new Date()
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const declineTradeOffer = async (tradeId: string, reason?: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await axios.put(`/api/trades/${tradeId}/decline`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('serviceswap_token')}`
        }
      });
      
      // Update pending offers - socket will handle real-time updates
      setPendingOffers(prev => prev.filter(offer => offer.id !== tradeId));
      
      // Socket will handle notifications
    } catch (error) {
      console.error('Error declining trade offer:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelTradeOffer = async (tradeId: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await axios.put(`/api/trades/${tradeId}/cancel`, {}, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('serviceswap_token')}`
        }
      });
      
      // Update sent offers - socket will handle real-time updates
      setSentOffers(prev => prev.filter(offer => offer.id !== tradeId));
      
    } catch (error) {
      console.error('Error cancelling trade offer:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const completeTrade = async (tradeId: string, credentials: Credentials | undefined): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await axios.put(`/api/trades/${tradeId}/complete`, {
        credentials
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('serviceswap_token')}`
        }
      });
      
      // Socket will handle moving the trade to completed and notifications
      
    } catch (error) {
      console.error('Error completing trade:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getTradeById = (tradeId: string): TradeOffer | null => {
    const allTrades = [...pendingOffers, ...sentOffers, ...completedTrades];
    return allTrades.find(trade => trade.id === tradeId) || null;
  };

  const getUserTradeHistory = (userId: string): TradeOffer[] => {
    return completedTrades.filter(trade => 
      trade.fromUserId === userId || trade.toUserId === userId
    );
  };

  const markNotificationAsRead = (notificationId: string): void => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
  };

  const canUserTrade = (userId: string): boolean => {
    const cooldownEnd = tradeCooldowns[userId];
    if (!cooldownEnd) return true;
    return new Date() > cooldownEnd;
  };

  const getTradeTimeRemaining = (userId: string): number => {
    const cooldownEnd = tradeCooldowns[userId];
    if (!cooldownEnd) return 0;
    const remaining = cooldownEnd.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / (1000 * 60))); // minutes
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: TradeContextType = {
    pendingOffers,
    sentOffers,
    completedTrades,
    notifications,
    unreadCount,
    sendTradeOffer,
    acceptTradeOffer,
    declineTradeOffer,
    cancelTradeOffer,
    completeTrade,
    getTradeById,
    getUserTradeHistory,
    markNotificationAsRead,
    canUserTrade,
    getTradeTimeRemaining,
    isLoading
  };

  return (
    <TradeContext.Provider value={value}>
      {children}
    </TradeContext.Provider>
  );
};