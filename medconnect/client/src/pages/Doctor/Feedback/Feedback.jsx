import { useState, useEffect, useMemo } from "react";
import {
  Star,
  MessageSquare,
  Reply,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { useDoctorReviews } from "../../../hooks/useDoctor";
import "./Feedback.scss";

// Add Spin component
// eslint-disable-next-line react/prop-types
const Spin = ({ size, tip }) => (
  <div className="feedback-spin">
    <div
      className={`feedback-spinner ${size === "large" ? "large" : ""}`}
    ></div>
    {tip && <div className="feedback-spin-tip">{tip}</div>}
  </div>
);

export default function Feedback() {
  const [filter, setFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [showResponseForm, setShowResponseForm] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const itemsPerPage = 10;

  // Memoize params to prevent unnecessary re-renders
  const reviewParams = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      rating: ratingFilter !== "all" ? ratingFilter : undefined,
      sortBy: sortBy,
    }),
    [currentPage, ratingFilter, sortBy, itemsPerPage]
  );

  const { reviews, loading, error, pagination, respondToReview, refetch } =
    useDoctorReviews(reviewParams);

  useEffect(() => {
    // Reviews data loaded
  }, [reviews, pagination]);

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`feedback-star ${index < rating ? "filled" : "empty"}`}
      />
    ));
  };

  const getModeBadge = (mode) => {
    switch (mode) {
      case "online":
        return { label: "Trực tuyến", className: "mode-badge online" };
      case "offline":
        return { label: "Tại phòng khám", className: "mode-badge offline" };
      default:
        return { label: "Không xác định", className: "mode-badge unknown" };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter reviews based on response status
  const filteredReviews =
    reviews?.filter((review) => {
      if (filter === "all") return true;
      if (filter === "responded")
        return review.doctorResponse && review.doctorResponse.trim() !== "";
      if (filter === "pending")
        return !review.doctorResponse || review.doctorResponse.trim() === "";
      return true;
    }) || [];

  const averageRating =
    reviews?.length > 0
      ? (
          reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        ).toFixed(1)
      : 0;

  // Get total from pagination if available, otherwise use current reviews count
  const totalReviews = pagination?.total || reviews?.length || 0;
  const pendingCount =
    reviews?.filter((r) => !r.doctorResponse || r.doctorResponse.trim() === "")
      .length || 0;
  const respondedCount =
    reviews?.filter((r) => r.doctorResponse && r.doctorResponse.trim() !== "")
      .length || 0;
  const totalPages =
    pagination?.pages || Math.ceil(totalReviews / itemsPerPage);

  const handleSubmitResponse = async (reviewId) => {
    if (!responseText.trim()) return;

    try {
      setSubmitting(true);
      await respondToReview(reviewId, responseText);
      setResponseText("");
      setShowResponseForm(null);
      await refetch(); // Refresh reviews
    } catch (error) {
      console.error("Failed to submit response:", error);
      alert("Có lỗi xảy ra khi gửi phản hồi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleRatingFilterChange = (newRating) => {
    setRatingFilter(newRating);
    setCurrentPage(1);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  // Refresh when filters change
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, ratingFilter, sortBy]);

  if (loading && !reviews?.length) {
    return (
      <div className="feedback-container">
        <div className="feedback-header">
          <h2 className="feedback-title">Đánh giá & Phản hồi</h2>
        </div>
        <div className="feedback-loading">
          <Spin size="large" tip="Đang tải đánh giá..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-container">
        <div className="feedback-header">
          <h2 className="feedback-title">Đánh giá & Phản hồi</h2>
        </div>
        <div className="feedback-error">
          <div className="error-text">
            Có lỗi xảy ra khi tải đánh giá: {error}
          </div>
          <Button onClick={() => refetch()} className="feedback-retry-btn">
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <div>
          <h2 className="feedback-title">Đánh giá & Phản hồi</h2>
          <p className="feedback-subtitle">
            Quản lý và phản hồi các đánh giá từ bệnh nhân
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="feedback-stats-grid">
        <Card className="feedback-stat-card">
          <div className="feedback-stat-value">{averageRating}</div>
          <div className="feedback-stat-stars">
            {renderStars(Math.round(parseFloat(averageRating)))}
          </div>
          <div className="feedback-stat-label">Đánh giá trung bình</div>
        </Card>

        <Card className="feedback-stat-card">
          <div className="feedback-stat-value">{totalReviews}</div>
          <div className="feedback-stat-label">Tổng số đánh giá</div>
        </Card>

        <Card className="feedback-stat-card">
          <div className="feedback-stat-value">{pendingCount}</div>
          <div className="feedback-stat-label">Chờ phản hồi</div>
        </Card>

        <Card className="feedback-stat-card">
          <div className="feedback-stat-value">{respondedCount}</div>
          <div className="feedback-stat-label">Đã phản hồi</div>
        </Card>
      </div>

      {/* Quick Filter Buttons */}
      <div className="feedback-quick-filters">
        <button
          className={`feedback-quick-filter-btn ${
            filter === "all" ? "active" : ""
          }`}
          onClick={() => handleFilterChange("all")}
        >
          Tất cả
        </button>
        <button
          className={`feedback-quick-filter-btn ${
            filter === "pending" ? "active" : ""
          }`}
          onClick={() => handleFilterChange("pending")}
        >
          Chờ phản hồi ({pendingCount})
        </button>
        <button
          className={`feedback-quick-filter-btn ${
            filter === "responded" ? "active" : ""
          }`}
          onClick={() => handleFilterChange("responded")}
        >
          Đã phản hồi ({respondedCount})
        </button>
        <button
          className={`feedback-quick-filter-btn ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          {showFilters ? "Ẩn bộ lọc" : "Hiển thị bộ lọc"}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="feedback-filters-card">
          <div className="feedback-filters-header">
            <Filter className="w-4 h-4" />
            <span>Bộ lọc và sắp xếp</span>
          </div>
          <div className="feedback-filters-content">
            <div className="feedback-filter-group">
              <label>Trạng thái phản hồi:</label>
              <div className="feedback-filter-buttons">
                <button
                  className={`feedback-filter-btn-small ${
                    filter === "all" ? "active" : ""
                  }`}
                  onClick={() => handleFilterChange("all")}
                >
                  Tất cả
                </button>
                <button
                  className={`feedback-filter-btn-small ${
                    filter === "pending" ? "active" : ""
                  }`}
                  onClick={() => handleFilterChange("pending")}
                >
                  Chờ phản hồi
                </button>
                <button
                  className={`feedback-filter-btn-small ${
                    filter === "responded" ? "active" : ""
                  }`}
                  onClick={() => handleFilterChange("responded")}
                >
                  Đã phản hồi
                </button>
              </div>
            </div>

            <div className="feedback-filter-group">
              <label>Đánh giá sao:</label>
              <div className="feedback-filter-buttons">
                <button
                  className={`feedback-filter-btn-small ${
                    ratingFilter === "all" ? "active" : ""
                  }`}
                  onClick={() => handleRatingFilterChange("all")}
                >
                  Tất cả
                </button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    className={`feedback-filter-btn-small ${
                      ratingFilter === String(rating) ? "active" : ""
                    }`}
                    onClick={() => handleRatingFilterChange(String(rating))}
                  >
                    {rating} sao
                  </button>
                ))}
              </div>
            </div>

            <div className="feedback-filter-group">
              <label>Sắp xếp theo:</label>
              <div className="feedback-filter-buttons">
                <button
                  className={`feedback-filter-btn-small ${
                    sortBy === "newest" ? "active" : ""
                  }`}
                  onClick={() => handleSortChange("newest")}
                >
                  Mới nhất
                </button>
                <button
                  className={`feedback-filter-btn-small ${
                    sortBy === "oldest" ? "active" : ""
                  }`}
                  onClick={() => handleSortChange("oldest")}
                >
                  Cũ nhất
                </button>
                <button
                  className={`feedback-filter-btn-small ${
                    sortBy === "highest" ? "active" : ""
                  }`}
                  onClick={() => handleSortChange("highest")}
                >
                  Đánh giá cao nhất
                </button>
                <button
                  className={`feedback-filter-btn-small ${
                    sortBy === "lowest" ? "active" : ""
                  }`}
                  onClick={() => handleSortChange("lowest")}
                >
                  Đánh giá thấp nhất
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card className="feedback-empty">
          <MessageSquare className="w-12 h-12 text-gray-400" />
          <h3>Chưa có đánh giá nào</h3>
          <p>Hiện tại chưa có đánh giá phù hợp với bộ lọc của bạn.</p>
        </Card>
      ) : (
        <div className="feedback-reviews-list">
          {filteredReviews.map((review) => {
            const modeBadge = getModeBadge(review.appointmentId?.mode);
            return (
              <Card key={review._id} className="feedback-review-item">
                <div className="feedback-review-header">
                  <div className="feedback-review-patient-info">
                    <h3 className="feedback-review-patient-name">Bệnh nhân</h3>
                    <div className="feedback-review-meta">
                      <div className="feedback-review-rating">
                        {renderStars(review.rating || 0)}
                      </div>
                      <span className="feedback-review-date">
                        <Calendar className="w-4 h-4" />
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <div className="feedback-review-badges">
                      <span className={modeBadge.className}>
                        {modeBadge.label}
                      </span>
                      {review.appointmentId?.reason && (
                        <span className="feedback-review-reason-badge">
                          {review.appointmentId.reason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {review.comment && (
                  <p className="feedback-review-comment">{review.comment}</p>
                )}

                {review.doctorResponse && review.doctorResponse.trim() ? (
                  <div className="feedback-review-response">
                    <div className="feedback-review-response-header">
                      <Reply className="w-4 h-4" />
                      <span className="feedback-review-response-title">
                        Phản hồi của bác sĩ:
                      </span>
                      <span className="feedback-review-response-date">
                        {formatDateTime(review.doctorResponseAt)}
                      </span>
                    </div>
                    <p className="feedback-review-response-text">
                      {review.doctorResponse}
                    </p>
                  </div>
                ) : (
                  <div className="feedback-review-response-form-container">
                    {showResponseForm === review._id ? (
                      <div className="feedback-review-response-form">
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Nhập phản hồi của bạn..."
                          className="feedback-response-textarea"
                          rows={4}
                        />
                        <div className="feedback-response-form-actions">
                          <Button
                            onClick={() => handleSubmitResponse(review._id)}
                            disabled={submitting || !responseText.trim()}
                            className="feedback-response-submit-btn"
                          >
                            {submitting ? "Đang gửi..." : "Gửi phản hồi"}
                          </Button>
                          <Button
                            onClick={() => {
                              setShowResponseForm(null);
                              setResponseText("");
                            }}
                            className="feedback-response-cancel-btn"
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setShowResponseForm(review._id)}
                        className="feedback-response-btn"
                      >
                        <Reply className="w-4 h-4" />
                        Phản hồi
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="feedback-pagination">
          <Button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            className="feedback-pagination-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            Trước
          </Button>
          <span className="feedback-pagination-info">
            Trang {currentPage} / {totalPages} ({totalReviews} đánh giá)
          </span>
          <Button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="feedback-pagination-btn"
          >
            Sau
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
