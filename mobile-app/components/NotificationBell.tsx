import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { farmAssistanceAPI } from '../services/yield_weather/farmAssistanceAPI';

interface Alert {
  id: string;
  title: string;
  activity: string;
  priority: string;
  action: string;
  reason: string;
  plotName: string;
  suggestedDate: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [newAlertsCount, setNewAlertsCount] = useState(0);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const DISMISSED_ALERTS_KEY = '@dismissed_alerts';

  useEffect(() => {
    loadDismissedAlerts();
    loadHighPriorityAlerts();
    
    // Pulse animation for badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadDismissedAlerts = async () => {
    try {
      const dismissed = await AsyncStorage.getItem(DISMISSED_ALERTS_KEY);
      if (dismissed) {
        setDismissedAlerts(new Set(JSON.parse(dismissed)));
      }
    } catch (error) {
      console.error('Failed to load dismissed alerts:', error);
    }
  };

  const saveDismissedAlerts = async (dismissed: Set<string>) => {
    try {
      await AsyncStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(Array.from(dismissed)));
    } catch (error) {
      console.error('Failed to save dismissed alerts:', error);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(alertId);
    setDismissedAlerts(newDismissed);
    await saveDismissedAlerts(newDismissed);
    
    // Update count immediately
    const unreadCount = alerts.filter(alert => !newDismissed.has(alert.id)).length;
    setNewAlertsCount(unreadCount);
  };

  const handleMarkAllAsRead = async () => {
    const allAlertIds = alerts.map(alert => alert.id);
    const newDismissed = new Set([...dismissedAlerts, ...allAlertIds]);
    setDismissedAlerts(newDismissed);
    await saveDismissedAlerts(newDismissed);
    
    // Update count to 0
    setNewAlertsCount(0);
  };

  const loadHighPriorityAlerts = async () => {
    try {
      setLoading(true);
      
      // Get real-time plot updates for the user
      const USER_ID = 1; // Use actual user ID
      const response = await farmAssistanceAPI.getRealtimePlotUpdates(USER_ID);
      
      if (response.success && response.data) {
        // Extract high priority activities from all plots
        const highPriorityAlerts: Alert[] = [];
        
        response.data.forEach((plot: any) => {
          // Get high and critical priority indicators from next_actions
          const nextActions = plot.next_actions || [];
          
          nextActions.forEach((action: any) => {
            if (action.priority === 'high' || action.priority === 'critical') {
              highPriorityAlerts.push({
                id: `${plot.plot_id}-${action.type}`,
                title: action.type.split('_').map((word: string) => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' '),
                activity: action.type,
                priority: action.priority,
                action: action.message,
                reason: `${plot.plot_name} (${plot.current_status.growth_stage.name}) - ${plot.current_status.days_old} days old`,
                plotName: `${plot.plot_name} - ${plot.farm_name}`,
                suggestedDate: new Date().toISOString().split('T')[0],
              });
            }
          });

          // Also check all status_indicators for high/critical priority
          const statusIndicators = plot.status_indicators || [];
          statusIndicators.forEach((indicator: any) => {
            if ((indicator.priority === 'high' || indicator.priority === 'critical') && 
                !highPriorityAlerts.find((a: Alert) => a.id === `${plot.plot_id}-${indicator.type}`)) {
              highPriorityAlerts.push({
                id: `${plot.plot_id}-${indicator.type}`,
                title: indicator.type.split('_').map((word: string) => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' '),
                activity: indicator.type,
                priority: indicator.priority,
                action: indicator.message,
                reason: `${plot.plot_name} (${plot.current_status.growth_stage.name}) - ${plot.current_status.days_old} days old`,
                plotName: `${plot.plot_name} - ${plot.farm_name}`,
                suggestedDate: new Date().toISOString().split('T')[0],
              });
            }
          });
        });
        
        setAlerts(highPriorityAlerts);
        // Update count excluding dismissed alerts
        const unreadCount = highPriorityAlerts.filter(
          alert => !dismissedAlerts.has(alert.id)
        ).length;
        setNewAlertsCount(unreadCount);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDropdown = () => {
    setVisible(true);
  };

  const handleCloseDropdown = () => {
    setVisible(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'critical':
        return '#DC2626';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'alert-circle';
      case 'medium':
        return 'warning';
      case 'low':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };

  return (
    <>
      <TouchableOpacity 
        onPress={handleOpenDropdown}
        style={styles.bellButton}
        activeOpacity={0.7}
      >
        <View style={styles.bellIconContainer}>
          <Ionicons name="notifications" size={24} color="#4CAF50" />
        </View>
        {newAlertsCount > 0 && (
          <Animated.View 
            style={[
              styles.badge,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Text style={styles.badgeText}>
              {newAlertsCount > 9 ? '9+' : newAlertsCount}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseDropdown}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={handleCloseDropdown}
        >
          <Pressable 
            style={styles.dropdownContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dropdownHeader}>
              <View style={styles.headerTitleContainer}>
                <Ionicons name="notifications" size={22} color="#2E7D32" />
                <Text style={styles.dropdownTitle}>{t('notifications.high_priority_alerts')}</Text>
              </View>
              <View style={styles.headerActions}>
                {alerts.filter(alert => !dismissedAlerts.has(alert.id)).length > 0 && (
                  <TouchableOpacity 
                    onPress={handleMarkAllAsRead}
                    style={styles.markAllButton}
                  >
                    <Ionicons name="checkmark-done" size={20} color="#2E7D32" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={handleCloseDropdown}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              style={styles.alertsList}
              contentContainerStyle={styles.alertsListContent}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2E7D32" />
                  <Text style={styles.loadingText}>{t('notifications.loading_alerts')}</Text>
                </View>
              ) : alerts.filter(alert => !dismissedAlerts.has(alert.id)).length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                  <Text style={styles.emptyTitle}>{t('notifications.all_clear')}</Text>
                  <Text style={styles.emptyText}>
                    {t('notifications.no_high_priority')}
                  </Text>
                </View>
              ) : (
                alerts
                  .filter(alert => !dismissedAlerts.has(alert.id))
                  .map((alert) => (
                  <View key={alert.id} style={styles.alertCard}>
                    <TouchableOpacity 
                      style={styles.dismissButton}
                      onPress={() => handleDismissAlert(alert.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                    </TouchableOpacity>

                    <View style={styles.alertHeader}>
                      <View style={styles.alertTitleContainer}>
                        <Ionicons 
                          name={getPriorityIcon(alert.priority)} 
                          size={20} 
                          color={getPriorityColor(alert.priority)} 
                        />
                        <Text style={styles.alertTitle}>{alert.title}</Text>
                      </View>
                      <View 
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: `${getPriorityColor(alert.priority)}15` },
                        ]}
                      >
                        <Text 
                          style={[
                            styles.priorityText,
                            { color: getPriorityColor(alert.priority) },
                          ]}
                        >
                          {alert.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.alertPlotInfo}>
                      <Ionicons name="location" size={14} color="#6B7280" />
                      <Text style={styles.alertPlotText}>{alert.plotName}</Text>
                    </View>

                    <Text style={styles.alertAction}>{alert.action}</Text>
                    <Text style={styles.alertReason}>{alert.reason}</Text>

                    <View style={styles.alertFooter}>
                      <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text style={styles.dateText}>
                          {t('notifications.suggested')}: {new Date(alert.suggestedDate).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {alerts.filter(alert => !dismissedAlerts.has(alert.id)).length > 0 && (
              <View style={styles.dropdownFooter}>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => {
                    handleCloseDropdown();
                    router.push('/yield-weather/FarmAssistance');
                  }}
                >
                  <Text style={styles.viewAllButtonText}>{t('notifications.view_all_activities')}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#2E7D32" />
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'relative',
    padding: 4,
  },
  bellIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9F4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllButton: {
    padding: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  alertsList: {
    maxHeight: 500,
  },
  alertsListContent: {
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    position: 'relative',
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 24,
  },
  alertTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  alertPlotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  alertPlotText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  alertAction: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
    fontWeight: '600',
  },
  alertReason: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dropdownFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
