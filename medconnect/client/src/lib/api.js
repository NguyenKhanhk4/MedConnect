const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Auth functions
export async function getCurrentUser() {
  try {
    const r = await fetch(`${BASE}/api/auth/me`, {
      credentials: "include",
    });
    if (!r.ok) {
      const errorText = await r.text();
      console.error(`API Error: ${r.status} - ${errorText}`);
      throw new Error(`API Error: ${r.status} - ${errorText}`);
    }
    const data = await r.json();
    return data;
  } catch (error) {
    // Check if it's a connection error
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("ERR_CONNECTION_REFUSED")
    ) {
      console.error(
        "Backend server is not running. Please start the server at http://localhost:3000"
      );
      // Return null instead of throwing to allow app to continue
      return null;
    }
    console.error("Error in getCurrentUser:", error);
    throw error;
  }
}

// Get current patient profile with full information
export async function getCurrentPatientProfile() {
  try {
    const r = await fetch(`${BASE}/api/patients/me/profile`, {
      credentials: "include",
    });
    if (!r.ok) {
      const errorText = await r.text();
      console.error(`API Error: ${r.status} - ${errorText}`);
      throw new Error(`API Error: ${r.status} - ${errorText}`);
    }
    const data = await r.json();
    return data;
  } catch (error) {
    // Check if it's a connection error
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("ERR_CONNECTION_REFUSED")
    ) {
      console.error(
        "Backend server is not running. Please start the server at http://localhost:3000"
      );
      // Return null instead of throwing to allow app to continue
      return null;
    }
    console.error("Error in getCurrentPatientProfile:", error);
    throw error;
  }
}

export async function updateCurrentPatientProfile(profileData) {
  try {
    const r = await fetch(`${BASE}/api/patients/me/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(profileData),
    });
    if (!r.ok) {
      const errorText = await r.text();
      console.error(`API Error: ${r.status} - ${errorText}`);
      throw new Error(`API Error: ${r.status} - ${errorText}`);
    }
    const data = await r.json();
    return data;
  } catch (error) {
    console.error("Error in updateCurrentPatientProfile:", error);
    throw error;
  }
}

// Delete family member
export async function deleteFamilyMember(patientId) {
  try {
    const r = await fetch(
      `${BASE}/api/patients/me/family-members/${patientId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    if (!r.ok) {
      const errorText = await r.text();
      throw new Error(errorText || "Failed to delete family member");
    }
    return await r.json();
  } catch (error) {
    console.error("Error deleting family member:", error);
    throw error;
  }
}

export async function registerDoctor(doctorData) {
  const r = await fetch(`${BASE}/api/auth/register-doctor`, {
    method: "POST",
    credentials: "include",
    body: doctorData, // FormData will set Content-Type automatically
  });
  if (!r.ok) {
    const errorText = await r.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText || "Có lỗi xảy ra khi đăng ký" };
    }
    const error = new Error(JSON.stringify(errorData));
    error.response = errorData;
    throw error;
  }
  return r.json();
}

export async function logout() {
  const r = await fetch(`${BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Complete logout with Firebase auth clearing
export async function completeLogout() {
  try {
    // Import clearAuthData dynamically to avoid circular imports
    const { clearAuthData } = await import("./firebase.js");

    // Clear server session
    await logout();

    // Clear all Firebase auth data
    await clearAuthData();

    // Force reload to ensure clean state
    window.location.reload();
  } catch (error) {
    console.error("Error during complete logout:", error);
    // Fallback: just reload the page
    window.location.reload();
  }
}

// Change password (requires authentication)
export async function changePassword(currentPassword, newPassword) {
  try {
    const r = await fetch(`${BASE}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    if (!r.ok) {
      const errorText = await r.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || "Có lỗi xảy ra khi đổi mật khẩu" };
      }
      const error = new Error(
        errorData.message || "Có lỗi xảy ra khi đổi mật khẩu"
      );
      error.status = r.status;
      error.response = errorData;
      throw error;
    }

    return await r.json();
  } catch (error) {
    console.error("Error changing password:", error);
    throw error;
  }
}

// Admin functions
export async function getPendingDoctors() {
  const r = await fetch(`${BASE}/api/admin/doctors/pending`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAllDoctorsForAdmin(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });

  const r = await fetch(`${BASE}/api/admin/doctors?${searchParams}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function approveDoctor(doctorId, adminNotes = "") {
  const r = await fetch(`${BASE}/api/admin/doctors/${doctorId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ adminNotes }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function rejectDoctor(doctorId, reason = "") {
  const r = await fetch(`${BASE}/api/admin/doctors/${doctorId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Patient functions
export async function getPatientProfile(patientId) {
  const r = await fetch(`${BASE}/api/patients/${patientId}/profile`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getPatientAppointments(patientId) {
  const r = await fetch(`${BASE}/api/patients/${patientId}/appointments`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getPatientMedicalRecords(patientId) {
  const r = await fetch(`${BASE}/api/patients/${patientId}/medical-records`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getPatientPrescriptions(patientId) {
  const r = await fetch(`${BASE}/api/patients/${patientId}/prescriptions`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getPatientPayments(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });
  const r = await fetch(`${BASE}/api/patients/me/payments?${searchParams}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getPatientNotifications(patientId) {
  const r = await fetch(`${BASE}/api/patients/${patientId}/notifications`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Doctor functions
export async function getDoctors() {
  const r = await fetch(`${BASE}/api/doctors`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function searchDoctors(query) {
  const r = await fetch(
    `${BASE}/api/doctors/search?q=${encodeURIComponent(query)}`,
    {
      credentials: "include",
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getDoctorDetails(doctorId) {
  const r = await fetch(`${BASE}/api/doctors/${doctorId}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getDoctorSchedule(doctorId) {
  const r = await fetch(`${BASE}/api/doctors/${doctorId}/schedule`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Current doctor functions (authenticated)
export async function getCurrentDoctorProfile() {
  const r = await fetch(`${BASE}/api/doctors/me/profile`, {
    credentials: "include",
  });
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(errorText);
  }
  return r.json();
}

export async function updateDoctorProfile(profileData) {
  const r = await fetch(`${BASE}/api/doctors/me/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(profileData),
  });
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(errorText);
  }
  return r.json();
}

export async function getDoctorAppointments(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });

  const r = await fetch(`${BASE}/api/doctors/me/appointments?${searchParams}`, {
    credentials: "include",
  });
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(errorText);
  }
  return r.json();
}

// Helper: get all appointments (public endpoint)
export async function getAllAppointments(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.page) queryParams.append("page", params.page);

    const response = await fetch(`${BASE}/api/appointments?${queryParams}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to fetch all appointments:", error);
    throw error;
  }
}

// Helper: get doctor appointments with fallback mechanism
export async function getDoctorAppointmentsWithFallback(params = {}) {
  try {
    // Try primary endpoint first
    const response = await getDoctorAppointments(params);

    const appointments =
      response?.data?.appointments || response?.appointments || response;
    if (appointments && appointments.length > 0) {
      return { success: true, data: { appointments } };
    }
  } catch (error) {
    // Primary endpoint failed, try fallback
  }

  try {
    // Fallback: get appointments from public endpoint using doctor ID
    const doctor = await getDoctorProfileWithFallback();

    if (doctor && doctor._id) {
      // Get all appointments and filter by doctor ID
      const allAppointments = await getAllAppointments({ limit: 1000 });

      const appointmentsList =
        allAppointments?.data?.appointments ||
        allAppointments?.appointments ||
        [];

      const doctorAppointments = appointmentsList.filter(
        (apt) => apt.doctorId === doctor._id || apt.doctorId?._id === doctor._id
      );

      return { success: true, data: { appointments: doctorAppointments } };
    }
  } catch (error) {
    // Fallback failed
  }

  return { success: true, data: { appointments: [] } };
}

export async function getDoctorDashboardStats() {
  const r = await fetch(`${BASE}/api/doctors/me/dashboard/stats`, {
    credentials: "include",
  });
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(errorText);
  }
  return r.json();
}

// Helper: get dashboard stats with fallback mechanism
export async function getDoctorDashboardStatsWithFallback() {
  try {
    // Try primary endpoint first
    const response = await getDoctorDashboardStats();
    const statsData =
      response?.data?.stats || response?.stats || response?.data || response;

    if (statsData) {
      // Map backend stats to frontend format
      return {
        todayAppointmentsCount:
          statsData.todayAppointments || statsData.todayAppointmentsCount || 0,
        availableSlotsToday:
          statsData.availableSlots || statsData.availableSlotsToday || 0,
        pendingAppointmentsCount:
          statsData.pendingAppointments ||
          statsData.pendingAppointmentsCount ||
          0,
        completedAppointmentsCount:
          statsData.completedAppointments ||
          statsData.completedAppointmentsCount ||
          0,
      };
    }
  } catch (error) {
    // Primary dashboard stats endpoint failed, using fallback
  }

  try {
    // Fallback: get basic stats from appointments
    const appointments = await getDoctorAppointmentsWithFallback({
      limit: 1000,
    });
    const appointmentsList =
      appointments?.data?.appointments || appointments?.appointments || [];

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Today's appointments (include: pending_doctor, accepted, in_progress, done, no_show)
    // Exclude: cancelled, rejected (these are not considered "appointments")
    const todayAppointments = appointmentsList.filter((apt) => {
      const aptDate = new Date(
        apt.scheduledStart || apt.scheduledDate || apt.createdAt
      );
      const isToday = aptDate >= startOfDay && aptDate <= endOfDay;
      const isValidStatus = [
        "pending_doctor",
        "accepted",
        "in_progress",
        "done",
        "no_show",
      ].includes(apt.status);
      return isToday && isValidStatus;
    }).length;

    // Available slots = appointments with cancelled/rejected status (these slots are available again)
    // For fallback, we approximate: available slots = cancelled + rejected appointments
    const cancelledRejectedToday = appointmentsList.filter((apt) => {
      const aptDate = new Date(
        apt.scheduledStart || apt.scheduledDate || apt.createdAt
      );
      const isToday = aptDate >= startOfDay && aptDate <= endOfDay;
      return (
        isToday && (apt.status === "cancelled" || apt.status === "rejected")
      );
    }).length;

    // Note: We can't get truly empty slots from appointments list alone
    // This is a fallback, so it's an approximation
    // Primary endpoint should handle the real calculation with DoctorTimeSlot
    const availableSlotsToday = cancelledRejectedToday;

    // Pending appointments (appointments in today that need doctor's confirmation)
    const pendingAppointments = appointmentsList.filter((apt) => {
      const aptDate = new Date(
        apt.scheduledStart || apt.scheduledDate || apt.createdAt
      );
      const isToday = aptDate >= startOfDay && aptDate <= endOfDay;
      const needsConfirmation = apt.status === "pending_doctor";
      return isToday && needsConfirmation;
    }).length;

    // Calculate completed appointments (all time)
    const completedAppointments = appointmentsList.filter(
      (apt) => apt.status === "done"
    ).length;

    const fallbackStats = {
      todayAppointmentsCount: todayAppointments,
      availableSlotsToday: availableSlotsToday,
      pendingAppointmentsCount: pendingAppointments,
      completedAppointmentsCount: completedAppointments,
    };

    return fallbackStats;
  } catch (error) {
    // Fallback dashboard stats failed
    return {
      todayAppointmentsCount: 0,
      availableSlotsToday: 0,
      pendingAppointmentsCount: 0,
      completedAppointmentsCount: 0,
    };
  }
}

export async function updateAppointmentStatus(
  appointmentId,
  status,
  cancelReason = null
) {
  const r = await fetch(
    `${BASE}/api/doctors/me/appointments/${appointmentId}/status`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, cancelReason }),
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Doctor time slot functions
export async function getDoctorTimeSlots(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });
  const url = `${BASE}/api/doctors/me/time-slots?${searchParams}`;
  const r = await fetch(url, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function autoGenerateTimeSlots() {
  const r = await fetch(`${BASE}/api/doctors/me/time-slots/auto-generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteTimeSlot(slotId) {
  const r = await fetch(`${BASE}/api/doctors/me/time-slots/${slotId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function blockSingleSlot(slotId, reason = "") {
  const r = await fetch(`${BASE}/api/doctors/me/time-slots/${slotId}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reason }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Leave request functions
export async function createLeaveRequest(slotId, reason) {
  const r = await fetch(`${BASE}/api/doctors/me/leave-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ slotId, reason }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function blockSlotsByDateRange(startDate, endDate, reason = "") {
  const r = await fetch(`${BASE}/api/doctors/me/time-slots/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ startDate, endDate, reason }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function unblockSlotsByDateRange(startDate, endDate) {
  const r = await fetch(`${BASE}/api/doctors/me/time-slots/unblock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ startDate, endDate }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Schedule rules functions
export async function getDoctorScheduleRules() {
  const r = await fetch(`${BASE}/api/doctors/me/schedule-rules`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateDoctorScheduleRules(scheduleRules) {
  const r = await fetch(`${BASE}/api/doctors/me/schedule-rules`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ scheduleRules }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Consultation and prescription functions
export async function getConsultationRecords(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });

  const r = await fetch(
    `${BASE}/api/doctors/me/consultation-records?${searchParams}`,
    {
      credentials: "include",
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getDoctorConsultationSummaries(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });

  const r = await fetch(
    `${BASE}/api/doctors/me/consultation-summaries?${searchParams}`,
    {
      credentials: "include",
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getDoctorConsultationAdvice(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });

  const r = await fetch(
    `${BASE}/api/doctors/me/consultation-advice?${searchParams}`,
    {
      credentials: "include",
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createConsultationSummary(summaryData) {
  const r = await fetch(`${BASE}/api/doctors/me/consultation-summaries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(summaryData),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createConsultationAdvice(adviceData) {
  const r = await fetch(`${BASE}/api/doctors/me/consultation-advice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(adviceData),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createPrescription(prescriptionData) {
  const r = await fetch(`${BASE}/api/doctors/me/prescriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(prescriptionData),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Appointment functions
export async function bookAppointment(appointmentData) {
  const r = await fetch(`${BASE}/api/appointments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(appointmentData),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function rescheduleAppointment(appointmentId, newDateTime) {
  const r = await fetch(
    `${BASE}/api/appointments/${appointmentId}/reschedule`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newDateTime }),
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function cancelAppointment(appointmentId) {
  const r = await fetch(`${BASE}/api/appointments/${appointmentId}/cancel`, {
    method: "PUT",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Manager functions
// Education Level Price Management (Manager)
export async function getEducationLevelPrices() {
  const r = await fetch(`${BASE}/api/managers/education-level-prices`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function setEducationLevelPrice(priceData) {
  const r = await fetch(`${BASE}/api/managers/education-level-prices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(priceData),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteEducationLevelPrice(priceId) {
  const r = await fetch(
    `${BASE}/api/managers/education-level-prices/${priceId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getManagerPatients(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });

  const r = await fetch(`${BASE}/api/managers/patients?${searchParams}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function rescheduleAppointmentByManager(
  appointmentId,
  newDateTime,
  reason,
  mode,
  clinicId
) {
  const r = await fetch(
    `${BASE}/api/managers/appointments/${appointmentId}/reschedule`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newDateTime, reason, mode, clinicId }),
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Payment functions
export async function makePayment(paymentData) {
  const r = await fetch(`${BASE}/api/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(paymentData),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Notification functions
export async function getNotifications(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });

  const r = await fetch(`${BASE}/api/notifications?${searchParams}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function markNotificationAsRead(notificationId) {
  const r = await fetch(`${BASE}/api/notifications/${notificationId}/read`, {
    method: "PUT",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function markAllNotificationsAsRead() {
  const r = await fetch(`${BASE}/api/notifications/read-all`, {
    method: "PUT",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Review functions
export async function getDoctorReviews(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });

  const r = await fetch(`${BASE}/api/doctors/me/reviews?${searchParams}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function respondToReview(reviewId, response) {
  const r = await fetch(`${BASE}/api/doctors/me/reviews/${reviewId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ response }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Review functions
export async function submitReview(reviewData) {
  const r = await fetch(`${BASE}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(reviewData),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Public doctor functions (for patient search)
export async function getAllDoctors(params = {}) {
  try {
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append("search", params.search);
    if (params.specialization)
      queryParams.append("specialization", params.specialization);
    if (params.location) queryParams.append("location", params.location);
    if (params.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const response = await fetch(`${BASE}/api/doctors?${queryParams}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to fetch doctors:", error);
    throw error;
  }
}

// Helper: find doctor by userId when /me endpoint is unavailable
export async function findDoctorByUserId(userId) {
  try {
    const list = await getAllDoctors({ limit: 1000 });
    const doctorsArray = list?.data?.doctors || list?.doctors || list;

    if (Array.isArray(doctorsArray)) {
      const found = doctorsArray.find((d) => {
        const doctorUserId = d?.userId?._id || d?.userId;
        return doctorUserId === userId;
      });
      return found;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Helper: get doctor profile with fallback mechanism
export async function getDoctorProfileWithFallback() {
  try {
    // Try primary endpoint first
    const response = await getCurrentDoctorProfile();
    const doctor = response?.data?.doctor || response?.doctor;
    if (doctor) {
      return doctor;
    }
  } catch (error) {
    // Primary endpoint failed, trying fallback
  }

  try {
    // Fallback: find by userId from patient profile (same as useUserProfile)
    const patientProfile = await getCurrentPatientProfile();
    const userId = patientProfile?.data?.user?._id || patientProfile?.user?._id;

    if (userId) {
      const found = await findDoctorByUserId(userId);
      if (found) {
        return found;
      }
    }
  } catch (error) {
    // Fallback failed
  }

  return null;
}

// Specialization functions
export async function getAllSpecializations(params = {}) {
  try {
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append("search", params.search);
    if (params.category) queryParams.append("category", params.category);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const response = await fetch(`${BASE}/api/specializations?${queryParams}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch specializations:", error);
    throw error;
  }
}

// Admin API functions
export async function getAdminDashboardStats() {
  const r = await fetch(`${BASE}/api/admin/dashboard/stats`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAdminStatistics(params = {}) {
  const { period = "today", startDate, endDate } = params;
  let url = `${BASE}/api/admin/statistics?period=${period}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  const r = await fetch(url, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAdminDashboardActivities(params = {}) {
  const { limit = 50, offset = 0 } = params;
  const queryParams = new URLSearchParams();
  if (limit) queryParams.append("limit", limit);
  if (offset) queryParams.append("offset", offset);

  const url = `${BASE}/api/admin/dashboard/activities${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;
  const r = await fetch(url, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAdminSystemStatus() {
  const r = await fetch(`${BASE}/api/admin/dashboard/system-status`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getPaymentRevenueStats(params = {}) {
  const { period = "today", startDate, endDate } = params;
  let url = `${BASE}/api/admin/payment/revenue-stats?period=${period}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  const r = await fetch(url, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAdminInvoices(params = {}) {
  const { period = "today", startDate, endDate } = params;
  let url = `${BASE}/api/admin/payment/invoices?period=${period}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  const r = await fetch(url, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getVerifiedDoctors() {
  const r = await fetch(`${BASE}/api/admin/doctors/verified`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getRejectedDoctors() {
  const r = await fetch(`${BASE}/api/admin/doctors/rejected`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAdminUsers(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.append("search", params.search);
  if (params.role) queryParams.append("role", params.role);

  const r = await fetch(`${BASE}/api/admin/users?${queryParams}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function banUser(userId) {
  const r = await fetch(`${BASE}/api/admin/users/${userId}/ban`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function suspendUser(userId) {
  const r = await fetch(`${BASE}/api/admin/users/${userId}/suspend`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function activateUser(userId) {
  const r = await fetch(`${BASE}/api/admin/users/${userId}/activate`, {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteUser(userId) {
  const r = await fetch(`${BASE}/api/admin/users/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getUserDetails(userId) {
  const r = await fetch(`${BASE}/api/admin/users/${userId}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createUser(userData) {
  const r = await fetch(`${BASE}/api/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(userData),
  });
  if (!r.ok) {
    const error = await r.json();
    throw new Error(error.message || "Không thể tạo người dùng");
  }
  return r.json();
}

export async function updateUser(userId, userData) {
  const r = await fetch(`${BASE}/api/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(userData),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function changeUserPassword(userId, newPassword) {
  const r = await fetch(`${BASE}/api/admin/users/${userId}/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ password: newPassword }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAdminSpecializations() {
  const r = await fetch(`${BASE}/api/admin/specializations`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getDoctorsBySpecialization(specializationId) {
  const r = await fetch(
    `${BASE}/api/admin/specializations/${specializationId}/doctors`,
    {
      credentials: "include",
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function addSpecialization(data) {
  const r = await fetch(`${BASE}/api/admin/specializations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateSpecialization(id, data) {
  const r = await fetch(`${BASE}/api/admin/specializations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteSpecialization(id) {
  const r = await fetch(`${BASE}/api/admin/specializations/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Admin Appointment Management APIs
export async function getAdminAppointments(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append("status", params.status);
  if (params.startDate) queryParams.append("startDate", params.startDate);
  if (params.endDate) queryParams.append("endDate", params.endDate);

  const r = await fetch(`${BASE}/api/admin/appointments?${queryParams}`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function updateAdminAppointmentStatus(appointmentId, status) {
  const r = await fetch(
    `${BASE}/api/admin/appointments/${appointmentId}/status`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    }
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteAdminAppointment(appointmentId) {
  const r = await fetch(`${BASE}/api/admin/appointments/${appointmentId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// Notification functions

// Create api object with all functions for easier import
const apiObject = {
  // Auth functions
  getCurrentUser,
  logout,

  // Patient functions
  getCurrentPatientProfile,
  getPatientProfile,
  getPatientAppointments,
  getPatientMedicalRecords,
  getPatientPrescriptions,
  getPatientPayments,
  getPatientNotifications,

  // Doctor functions
  getDoctors,
  searchDoctors,
  getDoctorDetails,
  getDoctorSchedule,
  getCurrentDoctorProfile,
  updateDoctorProfile,
  getDoctorAppointments,
  getDoctorDashboardStats,
  // Admin appointment functions
  getAdminAppointments,
  updateAdminAppointmentStatus,
  deleteAdminAppointment,

  // Consultation and prescription functions
  getConsultationRecords,
  getDoctorConsultationSummaries,
  getDoctorConsultationAdvice,
  createConsultationSummary,
  createPrescription,

  // Appointment functions
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  rescheduleAppointmentByManager,

  // Payment functions
  makePayment,

  // Notification functions
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,

  // Time slot management functions
  getDoctorTimeSlots,
  autoGenerateTimeSlots,
  deleteTimeSlot,
  blockSingleSlot,
  blockSlotsByDateRange,
  unblockSlotsByDateRange,
  createLeaveRequest,

  // Review functions
  getDoctorReviews,
  respondToReview,
  submitReview,

  // Public doctor functions
  getAllDoctors,
  getAllDoctorsForAdmin,

  // Specialization functions
  getAllSpecializations,

  // HTTP methods for direct API calls
  get: async (url, options = {}) => {
    const response = await fetch(`${BASE}${url}`, {
      credentials: "include",
      ...options,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  post: async (url, data, options = {}) => {
    const response = await fetch(`${BASE}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
      ...options,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  put: async (url, data, options = {}) => {
    const response = await fetch(`${BASE}${url}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
      ...options,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  delete: async (url, options = {}) => {
    const response = await fetch(`${BASE}${url}`, {
      method: "DELETE",
      credentials: "include",
      ...options,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },
};

// Get family members
export async function getFamilyMembers() {
  const r = await fetch(`${BASE}/api/patients/me/family-members`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// AI Chat functions
export async function createAiConversation() {
  const r = await fetch(`${BASE}/api/ai/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function sendAiMessage(conversationId, text, isAuthenticated = false) {
  const r = await fetch(`${BASE}/api/ai/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ conversationId, text, isAuthenticated }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAiConversationMessages(conversationId) {
  const r = await fetch(`${BASE}/api/ai/conversations/${conversationId}/messages`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getAiConversations() {
  const r = await fetch(`${BASE}/api/ai/conversations`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deleteAiConversation(conversationId) {
  const r = await fetch(`${BASE}/api/ai/conversations/${conversationId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export const api = apiObject;
