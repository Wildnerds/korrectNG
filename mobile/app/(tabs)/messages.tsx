import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { apiFetch, getToken } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';

interface Conversation {
  _id: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  artisan: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  artisanProfile: {
    businessName: string;
    slug: string;
    trade: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  lastMessageAt: string;
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!token) return;

    try {
      const res = await apiFetch<{ conversations: Conversation[] }>('/messages/conversations', { token });
      setConversations(res.data?.conversations || []);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return messageDate.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString('en-NG', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    }
  };

  const isCustomer = user?.role === 'customer';

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔐</Text>
        <Text style={styles.emptyTitle}>Login Required</Text>
        <Text style={styles.emptyText}>Please login to view your messages</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherPerson = isCustomer ? item.artisan : item.customer;
    const displayName = isCustomer
      ? item.artisanProfile?.businessName || `${item.artisan.firstName} ${item.artisan.lastName}`
      : `${item.customer.firstName} ${item.customer.lastName}`;

    return (
      <TouchableOpacity
        style={[styles.conversationCard, item.unreadCount > 0 && styles.unreadCard]}
        onPress={() => router.push(`/chat/${item._id}`)}
      >
        <View style={styles.avatarContainer}>
          {otherPerson.avatar ? (
            <Image source={{ uri: otherPerson.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {otherPerson.firstName.charAt(0)}{otherPerson.lastName.charAt(0)}
              </Text>
            </View>
          )}
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.name, item.unreadCount > 0 && styles.unreadName]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.time}>
              {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ''}
            </Text>
          </View>

          {isCustomer && (
            <Text style={styles.trade}>{item.artisanProfile?.trade}</Text>
          )}

          <Text
            style={[styles.lastMessage, item.unreadCount > 0 && styles.unreadMessage]}
            numberOfLines={1}
          >
            {item.lastMessage?.content || 'No messages yet'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No Messages Yet</Text>
          <Text style={styles.emptyText}>
            {isCustomer
              ? 'Start a conversation with an artisan to get quotes and discuss your job.'
              : 'When customers contact you, their messages will appear here.'}
          </Text>
          {isCustomer && (
            <TouchableOpacity style={styles.searchButton} onPress={() => router.push('/search')}>
              <Text style={styles.searchButtonText}>Find Artisans</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.green]} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flexGrow: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  unreadCard: {
    backgroundColor: '#F0FDF4',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.orange,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  unreadBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.black,
    flex: 1,
    marginRight: 10,
  },
  unreadName: {
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
    color: Colors.gray,
  },
  trade: {
    fontSize: 12,
    color: Colors.green,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  lastMessage: {
    fontSize: 14,
    color: Colors.gray,
  },
  unreadMessage: {
    color: Colors.black,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 86,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  searchButton: {
    backgroundColor: Colors.green,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 8,
  },
  searchButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: Colors.green,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
  },
  loginButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
