import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, getAllSpecializations } from "../../../lib/api";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Search, User } from "lucide-react";
import { CustomAlert } from "../../../components/ui/CustomAlert";
import "./DanhSachBacSi.scss";

export default function DanhSachBacSi() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [alertMessage, setAlertMessage] = useState(null);

  const showAlert = (message) => {
    setAlertMessage(message);
  };

  // Load specializations
  useEffect(() => {
    loadSpecializations();
  }, []);

  // Load doctors when filters change
  useEffect(() => {
    loadDoctors();
  }, [searchTerm, selectedSpecialization]);

  const loadSpecializations = async () => {
    try {
      const response = await getAllSpecializations();
      if (response.success) {
        setSpecializations(response.data || []);
      }
    } catch (error) {
      console.error("Error loading specializations:", error);
    }
  };

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (searchTerm.trim()) {
        params.append("name", searchTerm.trim());
      }

      if (selectedSpecialization !== "all") {
        params.append("specializationId", selectedSpecialization);
      }

      const response = await api.get(
        `/api/managers/doctors?${params.toString()}`
      );

      if (response.success) {
        setDoctors(response.data.doctors || []);
      } else {
        showAlert("Không thể tải danh sách bác sĩ");
        setDoctors([]);
      }
    } catch (error) {
      console.error("Error loading doctors:", error);
      showAlert("Có lỗi xảy ra khi tải danh sách bác sĩ");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorClick = (doctorId) => {
    navigate(`/manager/quan-ly-lich?doctorId=${doctorId}`);
  };

  const getSpecializationName = (doctor) => {
    if (doctor.specializationIds && doctor.specializationIds.length > 0) {
      const firstSpec = doctor.specializationIds[0];
      if (typeof firstSpec === "object" && firstSpec.name) {
        return firstSpec.name;
      }
    }
    return "Chưa có chuyên khoa";
  };

  return (
    <div className="manager-doctor-list">
      <div className="page-header">
        <h1>Danh sách bác sĩ</h1>
        <p>Quản lý và xem thông tin tất cả các bác sĩ</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-filter">
          <Search className="search-icon" />
          <Input
            type="text"
            placeholder="Tìm kiếm theo tên bác sĩ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="specialization-filter">
          <select
            value={selectedSpecialization}
            onChange={(e) => setSelectedSpecialization(e.target.value)}
            className="specialization-select"
          >
            <option value="all">Tất cả chuyên khoa</option>
            {specializations.map((spec) => (
              <option key={spec._id || spec.id} value={spec._id || spec.id}>
                {spec.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <div className="loading-state">
          <p>Đang tải danh sách bác sĩ...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div className="empty-state">
          <User className="empty-icon" />
          <p>Không tìm thấy bác sĩ nào</p>
        </div>
      ) : (
        <div className="doctors-grid">
          {doctors.map((doctor) => (
            <div
              key={doctor._id}
              className="doctor-card"
              onClick={() => handleDoctorClick(doctor._id)}
            >
              <div className="doctor-avatar">
                {doctor.avatarUrl ? (
                  <img
                    src={doctor.avatarUrl}
                    alt={doctor.fullName}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="avatar-placeholder"
                  style={{ display: doctor.avatarUrl ? "none" : "flex" }}
                >
                  <User size={40} />
                </div>
              </div>
              <div className="doctor-name">{doctor.fullName}</div>
              <Button
                className="specialty-button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {getSpecializationName(doctor)}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Custom Alert */}
      <CustomAlert
        message={alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Hệ thống MedConnect"
      />
    </div>
  );
}

