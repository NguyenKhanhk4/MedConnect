import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Filter,
  Star,
  MapPin,
  Calendar,
  User,
  ChevronDown,
} from "lucide-react";
import { HeartOutlined, HeartFilled } from "@ant-design/icons";
import { api } from "../../../lib/api";
import { message, Spin, Button } from "antd";
import { useAuth } from "../../../hooks/useAuth";
import { useSpecializations } from "../../../hooks/useSpecializations";
import { useFavoriteToggle } from "../../../hooks/useFavoriteToggle";
import { useLocations } from "../../../hooks/useLocations";
import { useDoctorVisitCounts } from "../../../hooks/useDoctorVisitCounts";
import { filterDoctorsBySearch } from "../../../utils/searchUtils";
import {
  getFullName,
  getSpecializationNames,
  formatDoctorRating,
} from "../../../utils/doctorUtils";
import "./TimKiemBacSi.scss";

// Doctor Card Component
const DoctorCard = ({
  doctor,
  isFavorite,
  isLoading,
  visitCount,
  onToggleFavorite,
  onBookAppointment,
  user,
}) => {
  const doctorName = getFullName(doctor.userId || doctor || {});
  const specialty = getSpecializationNames(doctor.specializationIds || []);
  const ratingText = formatDoctorRating(doctor.ratingAvg, doctor.ratingCount);

  return (
    <div className="doctor-card">
      <div className="verification-badge">Đã xác minh</div>

      <Button
        type="text"
        onClick={(e) => onToggleFavorite(e, doctor._id)}
        disabled={isLoading}
        style={{
          position: "absolute",
          top: "1rem",
          right: "6.5rem",
          zIndex: 10,
          padding: 0,
          minWidth: "32px",
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        className="favorite-button"
      >
        {isLoading ? (
          <Spin size="small" style={{ margin: 0 }} />
        ) : isFavorite ? (
          <HeartFilled style={{ color: "#ff4d4f", fontSize: "20px" }} />
        ) : (
          <HeartOutlined style={{ fontSize: "20px" }} />
        )}
      </Button>

      <div className="doctor-content">
        <div>
          {doctor.avatarUrl && !doctor.avatarUrl.includes("picsum.photos") ? (
            <img
              src={doctor.avatarUrl}
              alt={doctorName}
              className="avatar-image"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextElementSibling?.classList.remove("hidden");
              }}
            />
          ) : null}
          {(!doctor.avatarUrl ||
            doctor.avatarUrl.includes("picsum.photos")) && (
            <User className="default-avatar" />
          )}
        </div>

        <div className="doctor-info">
          <h3 className="doctor-name">{doctorName}</h3>
          <p className="doctor-specialty">{specialty}</p>
          <p className="doctor-experience">
            {doctor.yearsExperience || 0} năm kinh nghiệm
          </p>

          <div className="doctor-rating">
            <Star className="star-icon" />
            <span className="rating-text">{ratingText}</span>
          </div>

          {user && visitCount > 0 && (
            <div className="doctor-visit-count">
              <Calendar className="visit-icon" size={14} />
              <span className="visit-text">Đã khám {visitCount} lần</span>
            </div>
          )}

          <div className="doctor-status">
            <span className="status-badge">Có lịch hôm nay</span>
          </div>

          <div className="doctor-location">
            <MapPin className="location-icon" />
            <span className="location-text">
              {doctor.clinicDefaultId?.name || "Bệnh viện Đa khoa Trung ương"}
            </span>
          </div>
        </div>
      </div>

      <div className="fee-actions-section">
        <div className="doctor-actions">
          <button
            className="action-button book-button"
            onClick={() => onBookAppointment(doctor._id)}
          >
            <Calendar className="button-icon" />
            Đặt lịch
          </button>
        </div>
      </div>
    </div>
  );
};

export function TimKiemBacSi() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { specializations } = useSpecializations();
  const locations = useLocations();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [allDoctors, setAllDoctors] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    specialty: "",
    experience: "",
    rating: "",
    priceRange: "",
    location: "",
    availability: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const { favoriteDoctorIds, favoriteLoadingIds, handleToggleFavorite } =
    useFavoriteToggle(user, navigate);

  // Prevent form submission that might cause page reload
  useEffect(() => {
    const handleFormSubmit = (e) => {
      const form = e.target;
      const searchInput = form?.querySelector?.(".search-input");
      if (searchInput) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    document.addEventListener("submit", handleFormSubmit, true);
    return () => {
      document.removeEventListener("submit", handleFormSubmit, true);
    };
  }, []);

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      try {
        await fetchDoctorsFromAPI(true);
      } finally {
        setLoading(false);
      }
    };
    initialLoad();
  }, []);

  // Reload doctors from API when filters change
  useEffect(() => {
    fetchDoctorsFromAPI();
  }, [
    filters.specialty,
    filters.experience,
    filters.rating,
    filters.priceRange,
    filters.location,
    filters.availability,
  ]);

  // Filter doctors locally when searchTerm or allDoctors changes
  const filteredDoctors = useMemo(() => {
    if (allDoctors.length === 0) return [];
    return filterDoctorsBySearch(allDoctors, searchTerm);
  }, [searchTerm, allDoctors]);

  const doctorVisitCounts = useDoctorVisitCounts(user, filteredDoctors);

  // Fetch doctors from API
  const fetchDoctorsFromAPI = async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) {
        setLoading(true);
      }
      setIsSearching(true);

      const params = new URLSearchParams();
      if (filters.specialty) params.append("specialization", filters.specialty);
      if (filters.experience) params.append("experience", filters.experience);
      if (filters.rating) params.append("rating", filters.rating);
      if (filters.priceRange) params.append("priceRange", filters.priceRange);
      if (filters.location) params.append("location", filters.location);
      if (filters.availability)
        params.append("availability", filters.availability);
      params.append("limit", "1000");

      const response = await api.get(`/api/doctors?${params.toString()}`);

      if (response.success) {
        setAllDoctors(response.data.doctors || []);
      } else {
        message.error("Không thể tải danh sách bác sĩ");
      }
    } catch (error) {
      message.error("Có lỗi xảy ra khi tìm kiếm bác sĩ");
    } finally {
      if (!isInitialLoad) {
        setLoading(false);
      }
      setIsSearching(false);
    }
  };

  const handleBookAppointment = (doctorId) => {
    // Find the doctor object from filteredDoctors
    const selectedDoctor = filteredDoctors.find((doc) => doc._id === doctorId);

    if (selectedDoctor) {
      // Navigate to time slot selection with doctor and specialization info
      navigate("/dat-lich/chon-thoi-gian", {
        state: {
          doctor: selectedDoctor,
          specialization: selectedDoctor.specializationIds?.[0] || null,
        },
      });
    } else {
      message.error("Không tìm thấy thông tin bác sĩ");
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilters({
      specialty: "",
      experience: "",
      rating: "",
      priceRange: "",
      location: "",
      availability: "",
    });
    setShowFilters(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFiltersButton = () => {
    fetchDoctorsFromAPI();
    setShowFilters(false);
  };

  const getStatusText = () => {
    return "Có lịch hôm nay";
  };

  if (loading) {
    return (
      <div className="doctor-search-page">
        <div className="loading-container">
          <Spin size="large">
            <div style={{ padding: "50px" }}>
              <div style={{ textAlign: "center", marginTop: "20px" }}>
                Đang tải danh sách bác sĩ...
              </div>
            </div>
          </Spin>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-search-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Tìm bác sĩ</h1>
          <p className="page-description">
            Tìm kiếm và đặt lịch với các bác sĩ chuyên khoa
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="search-filter-section">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Tìm kiếm bác sĩ, chuyên khoa..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                // Prevent form submission and page reload on Enter
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  // Search is already applied via useEffect
                  return false; // Additional prevention
                }
              }}
              onKeyPress={(e) => {
                // Additional prevention for Enter key
                if (e.key === "Enter" || e.which === 13) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false; // Additional prevention
                }
              }}
              className="search-input"
              autoComplete="off"
              autoFocus={false}
            />
          </div>

          <div className="filter-container">
            <select
              value={filters.specialty}
              onChange={(e) => handleFilterChange("specialty", e.target.value)}
              className="specialty-select"
            >
              <option value="">Tất cả chuyên khoa</option>
              {specializations.length > 0 ? (
                specializations.map((spec) => (
                  <option key={spec._id} value={spec._id}>
                    {spec.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  Đang tải chuyên khoa...
                </option>
              )}
            </select>
            <ChevronDown className="select-arrow" />
          </div>

          <button
            className="filter-button"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="filter-icon" />
            Bộ lọc
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="advanced-filters">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Kinh nghiệm</label>
                <select
                  value={filters.experience}
                  onChange={(e) =>
                    handleFilterChange("experience", e.target.value)
                  }
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  <option value="1-3">1-3 năm</option>
                  <option value="3-5">3-5 năm</option>
                  <option value="5-10">5-10 năm</option>
                  <option value="10+">Trên 10 năm</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Đánh giá</label>
                <select
                  value={filters.rating}
                  onChange={(e) => handleFilterChange("rating", e.target.value)}
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  <option value="4.5-5.0">4.5 - 5.0 sao</option>
                  <option value="4.0-4.5">4.0 - 4.5 sao</option>
                  <option value="3.5-4.0">3.5 - 4.0 sao</option>
                  <option value="3.0-3.5">3.0 - 3.5 sao</option>
                  <option value="0-3.0">Dưới 3.0 sao</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Mức phí</label>
                <select
                  value={filters.priceRange}
                  onChange={(e) =>
                    handleFilterChange("priceRange", e.target.value)
                  }
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  <option value="0-300000">Dưới 300k</option>
                  <option value="300000-500000">300k - 500k</option>
                  <option value="500000-1000000">500k - 1M</option>
                  <option value="1000000+">Trên 1M</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Khu vực</label>
                <select
                  value={filters.location}
                  onChange={(e) =>
                    handleFilterChange("location", e.target.value)
                  }
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  {locations.length > 0 ? (
                    locations.map((location) => (
                      <option
                        key={location}
                        value={location.toLowerCase().replace(/\s+/g, "-")}
                      >
                        {location}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="quan-1">Quận 1</option>
                      <option value="quan-2">Quận 2</option>
                      <option value="quan-3">Quận 3</option>
                      <option value="quan-7">Quận 7</option>
                      <option value="quan-10">Quận 10</option>
                    </>
                  )}
                </select>
              </div>

              <div className="filter-group">
                <label>Tình trạng</label>
                <select
                  value={filters.availability}
                  onChange={(e) =>
                    handleFilterChange("availability", e.target.value)
                  }
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  <option value="available-today">Có lịch hôm nay</option>
                  <option value="available-week">Có lịch tuần này</option>
                  <option value="online">Tư vấn online</option>
                </select>
              </div>
            </div>

            <div className="filter-actions">
              <button className="clear-filters-btn" onClick={clearAllFilters}>
                Xóa bộ lọc
              </button>
              <button
                className="apply-filters-btn"
                onClick={applyFiltersButton}
              >
                Áp dụng
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="results-count">
          Tìm thấy {filteredDoctors.length} bác sĩ
        </div>

        {/* Doctors Grid */}
        <div className="doctors-grid">
          {filteredDoctors.length === 0 ? (
            <div className="empty-state">
              <p>Không tìm thấy bác sĩ nào phù hợp với tiêu chí tìm kiếm.</p>
            </div>
          ) : (
            filteredDoctors.map((doctor) => (
              <DoctorCard
                key={doctor._id}
                doctor={doctor}
                isFavorite={favoriteDoctorIds.has(doctor._id)}
                isLoading={favoriteLoadingIds.has(doctor._id)}
                visitCount={doctorVisitCounts.get(doctor._id) || 0}
                onToggleFavorite={handleToggleFavorite}
                onBookAppointment={handleBookAppointment}
                user={user}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
