import Appointment from '../models/appointment.model.js';

/**
 * Get appointment by slotId
 * @route GET /api/appointments/slot/:slotId
 */
export async function getAppointmentBySlotId(req, res) {
  try {
    const { slotId } = req.params;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID is required'
      });
    }

    console.log("🔍 Getting appointment by slotId:", slotId);

    // Find appointment by slotId
    const appointment = await Appointment.findOne({ slotId })
      .populate('patientId', 'fullName dob gender phone')
      .populate('doctorId', 'fullName specializationIds licenseNo')
      .lean();

    if (!appointment) {
      console.log("❌ No appointment found for slotId:", slotId);
      return res.status(404).json({
        success: false,
        message: 'Appointment not found for this slot'
      });
    }

    console.log("✅ Found appointment:", appointment._id.toString());

    // Ensure patientId is properly populated
    let patientId = appointment.patientId;
    if (!patientId || (typeof patientId === 'object' && !patientId.fullName)) {
      console.warn(`⚠️ Appointment ${appointment._id} has invalid patientId:`, patientId);
      patientId = {
        _id: appointment.patientId?._id || appointment.patientId || null,
        fullName: appointment.patientId?.fullName || "Không có thông tin",
        dob: appointment.patientId?.dob || null,
        gender: appointment.patientId?.gender || null,
        phone: appointment.patientId?.phone || null,
      };
    }

    // Ensure new fields have default values for backward compatibility
    const appointmentWithDefaults = {
      ...appointment,
      patientId, // Use properly populated patientId
      services: appointment.services || [],
      totalPay: appointment.totalPay !== undefined && appointment.totalPay !== null ? appointment.totalPay : 0,
      amountPaid: appointment.amountPaid !== undefined && appointment.amountPaid !== null ? appointment.amountPaid : 0,
      paymentStatus: appointment.paymentStatus || 'unpaid',
    };

    return res.json({
      success: true,
      data: {
        appointmentId: appointmentWithDefaults._id.toString(),
        appointment: appointmentWithDefaults
      }
    });

  } catch (error) {
    console.error("❌ Error getting appointment by slotId:", error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

