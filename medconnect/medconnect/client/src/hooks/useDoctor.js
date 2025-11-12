import { useState, useEffect, useCallback, useRef } from "react";
import { auth } from "../lib/firebase";
import { 
  getCurrentDoctorProfile, 
  updateDoctorProfile, 
  getDoctorAppointments, 
  getDoctorDashboardStats,
  updateAppointmentStatus,
  getConsultationRecords,
  createConsultationSummary,
  createPrescription,
  getDoctorTimeSlots,
  autoGenerateTimeSlots,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getDoctorReviews,
  respondToReview
} from "../lib/api.js";

export function useDoctor() {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authUser, setAuthUser] = useState(null);

  // Listen to authentication changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("🔍 Auth state changed in useDoctor:", user?.uid);
      setAuthUser(user);
      
      // If user changed, clear current data and refetch
      if (user) {
        setDoctor(null);
        setError(null);
      } else {
        setDoctor(null);
        setError(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchDoctorProfile = useCallback(async () => {
    // Don't fetch if no authenticated user
    if (!authUser) {
      console.log("🔍 No authenticated user, skipping doctor profile fetch");
      setDoctor(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("🔍 Fetching doctor profile for user:", authUser.uid);
      const response = await getCurrentDoctorProfile();
      setDoctor(response.doctor);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch doctor profile:", err);
    } finally {
      setLoading(false);
    }
  }, [authUser?.uid]);

  const updateProfile = useCallback(async (profileData) => {
    try {
      setError(null);
      const response = await updateDoctorProfile(profileData);
      setDoctor(response.doctor);
      return response.doctor;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    // Only fetch if we have an authenticated user
    if (authUser) {
      console.log("🔍 AuthUser available, fetching doctor profile...");
      fetchDoctorProfile();
    } else {
      console.log("🔍 No authUser, skipping doctor profile fetch");
    }
  }, [fetchDoctorProfile, authUser]);

  return {
    doctor,
    loading,
    error,
    refetch: fetchDoctorProfile,
    updateProfile
  };
}

export function useDoctorAppointments(params = {}) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchAppointments = useCallback(async (newParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDoctorAppointments({ ...params, ...newParams });
      setAppointments(response.appointments);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const updateStatus = useCallback(async (appointmentId, status, cancelReason = null) => {
    try {
      setError(null);
      const response = await updateAppointmentStatus(appointmentId, status, cancelReason);
      
      // Update the appointment in the local state
      setAppointments(prev => 
        prev.map(apt => 
          apt._id === appointmentId ? response.appointment : apt
        )
      );
      
      return response.appointment;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    pagination,
    refetch: fetchAppointments,
    updateStatus
  };
}

export function useDoctorDashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDoctorDashboardStats();
      setStats(response.stats);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

export function useConsultationRecords(params = {}) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchRecords = useCallback(async (newParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getConsultationRecords({ ...params, ...newParams });
      setRecords(response.records);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch consultation records:", err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const createSummary = useCallback(async (summaryData) => {
    try {
      setError(null);
      const response = await createConsultationSummary(summaryData);
      // Refresh records after creating summary
      await fetchRecords();
      return response.summary;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchRecords]);

  const createPrescriptionRecord = useCallback(async (prescriptionData) => {
    try {
      setError(null);
      const response = await createPrescription(prescriptionData);
      // Refresh records after creating prescription
      await fetchRecords();
      return response.prescription;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchRecords]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    records,
    loading,
    error,
    pagination,
    refetch: fetchRecords,
    createSummary,
    createPrescription: createPrescriptionRecord
  };
}

export function useDoctorTimeSlots(params = {}) {
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Listen to authentication changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setAuthUser(user);
      
      // Only clear data if user logs out, not when user changes
      if (!user) {
        setTimeSlots([]);
        setError(null);
        setLoading(false);
        setHasInitialized(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchTimeSlots = useCallback(async () => {
    // Don't fetch if no authenticated user
    if (!authUser) {
      setTimeSlots([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await getDoctorTimeSlots(params);
      console.log("🔍 useDoctorTimeSlots - Raw response:", response);
      
      // Handle different response formats with more robust extraction
      let slots = [];
      
      // Direct extraction from response structure
      if (response?.data?.slots && Array.isArray(response.data.slots)) {
        slots = response.data.slots;
      } else if (response?.slots && Array.isArray(response.slots)) {
        slots = response.slots;
      } else if (response?.timeSlots && Array.isArray(response.timeSlots)) {
        slots = response.timeSlots;
      } else if (response?.data && Array.isArray(response.data)) {
        slots = response.data;
      } else if (Array.isArray(response)) {
        slots = response;
      }
      
      console.log("🔍 useDoctorTimeSlots - Extracted slots:", slots);
      
      // Validate and filter slots data
      if (slots.length > 0) {
        console.log("🔍 useDoctorTimeSlots - First slot:", slots[0]);
        const validSlots = slots.filter(slot => {
          const isValid = slot && 
            (slot._id || slot.id) && 
            slot.startAt && 
            slot.endAt && 
            slot.status &&
            Object.keys(slot).length > 0; // Ensure slot is not empty object
          
          if (!isValid) {
            console.log("🔍 useDoctorTimeSlots - Invalid slot:", slot);
          }
          
          return isValid;
        });
        
        console.log("🔍 useDoctorTimeSlots - Valid slots:", validSlots.length);
        
        if (validSlots.length > 0) {
          setTimeSlots(validSlots);
        } else {
          setTimeSlots([]);
        }
      } else {
        console.log("🔍 useDoctorTimeSlots - No slots found");
        setTimeSlots([]);
      }
    } catch (err) {
      setError(err.message);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  }, [params.startDate, params.endDate, authUser?.uid]); // Simplified dependencies

  const autoGenerateSlots = useCallback(async () => {
    try {
      setError(null);
      const response = await autoGenerateTimeSlots();
      await fetchTimeSlots(); // Refresh the list
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchTimeSlots]);


  useEffect(() => {
    // Only fetch if we have an authenticated user and haven't initialized yet
    if (authUser && !hasInitialized) {
      fetchTimeSlots();
      setHasInitialized(true);
    } else if (!authUser) {
      setHasInitialized(false);
    }
  }, [authUser?.uid, hasInitialized]);

  // Separate effect to handle date parameter changes
  useEffect(() => {
    if (authUser && hasInitialized && (params.startDate || params.endDate)) {
      fetchTimeSlots();
    }
  }, [params.startDate, params.endDate, authUser?.uid, hasInitialized]);

  return {
    timeSlots,
    loading,
    error,
    refetch: fetchTimeSlots,
    autoGenerateTimeSlots: autoGenerateSlots
  };
}

export function useDoctorDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDoctorDashboardStats();
      setDashboardData(response);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    dashboardData,
    loading,
    error,
    refetch: fetchDashboardData
  };
}

export function useDoctorNotifications(params = {}) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getNotifications(params);
      setNotifications(response.notifications || []);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      setError(null);
      await markNotificationAsRead(notificationId);
      await fetchNotifications(); // Refresh the list
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      setError(null);
      await markAllNotificationsAsRead();
      await fetchNotifications(); // Refresh the list
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead
  };
}

export function useDoctorPrescriptions(params = {}) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // This would need to be implemented in api.js
      // const response = await getDoctorPrescriptions(params);
      // setPrescriptions(response.prescriptions || []);
      setPrescriptions([]); // Placeholder
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch prescriptions:", err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const createNewPrescription = useCallback(async (prescriptionData) => {
    try {
      setError(null);
      const response = await createPrescription(prescriptionData);
      await fetchPrescriptions(); // Refresh the list
      return response.prescription;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchPrescriptions]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  return {
    prescriptions,
    loading,
    error,
    refetch: fetchPrescriptions,
    createPrescription: createNewPrescription
  };
}

export function useDoctorReviews(params = {}) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  // Create a stable reference for params comparison
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDoctorReviews(paramsRef.current);
      console.log("🔍 useDoctorReviews - API Response:", response);
      
      // Handle different response structures
      let reviewsData = [];
      let paginationData = null;
      
      if (response.data) {
        // Response has { success: true, data: { reviews: [...], pagination: {...} } }
        reviewsData = response.data.reviews || response.data.data?.reviews || [];
        paginationData = response.data.pagination || response.data.data?.pagination || null;
      } else if (response.reviews) {
        // Response has { reviews: [...], pagination: {...} }
        reviewsData = response.reviews || [];
        paginationData = response.pagination || null;
      } else {
        // Fallback
        reviewsData = [];
        paginationData = null;
      }
      
      console.log("🔍 useDoctorReviews - Parsed data:", {
        reviewsCount: reviewsData.length,
        pagination: paginationData
      });
      
      setReviews(reviewsData);
      setPagination(paginationData);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch reviews:", err);
      setReviews([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const respondToReviewItem = useCallback(async (reviewId, response) => {
    try {
      setError(null);
      await respondToReview(reviewId, response);
      await fetchReviews(); // Refresh the list
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [fetchReviews]);

  useEffect(() => {
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  return {
    reviews,
    loading,
    error,
    pagination,
    refetch: fetchReviews,
    respondToReview: respondToReviewItem
  };
}
