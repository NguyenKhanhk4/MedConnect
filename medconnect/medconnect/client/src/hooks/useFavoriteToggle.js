import { useState, useEffect } from "react";
import { message } from "antd";
import { api } from "../lib/api";

/**
 * Custom hook for toggling favorite doctor status
 * @param {Object} user - Current user object
 * @param {Function} navigate - Navigation function
 * @returns {Object} { favoriteDoctorIds, favoriteLoadingIds, handleToggleFavorite }
 */
export function useFavoriteToggle(user, navigate) {
  const [favoriteDoctorIds, setFavoriteDoctorIds] = useState(new Set());
  const [favoriteLoadingIds, setFavoriteLoadingIds] = useState(new Set());

  // Fetch favorite doctors if user is logged in
  useEffect(() => {
    if (user) {
      fetchFavoriteDoctors();
    }
  }, [user]);

  const fetchFavoriteDoctors = async () => {
    try {
      const response = await api.get("/api/patients/me/favorite-doctors");
      if (response.success && response.data.favoriteDoctors) {
        const favoriteIds = new Set(
          response.data.favoriteDoctors.map((doc) => doc._id)
        );
        setFavoriteDoctorIds(favoriteIds);
      }
    } catch (error) {
      // Silently fail if user is not logged in or endpoint doesn't exist
    }
  };

  const handleToggleFavorite = async (e, doctorId) => {
    e.stopPropagation();

    if (!user) {
      message.warning("Vui lòng đăng nhập để sử dụng tính năng này");
      navigate("/dang-nhap", {
        state: {
          from: "/benh-nhan/tim-bac-si",
          message: "Vui lòng đăng nhập để thêm bác sĩ vào danh sách ưa thích",
        },
      });
      return;
    }

    const isFavorite = favoriteDoctorIds.has(doctorId);
    const previousFavoriteIds = new Set(favoriteDoctorIds);

    // Optimistic update
    if (isFavorite) {
      setFavoriteDoctorIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doctorId);
        return newSet;
      });
    } else {
      setFavoriteDoctorIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(doctorId);
        return newSet;
      });
    }

    setFavoriteLoadingIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(doctorId);
      return newSet;
    });

    try {
      if (isFavorite) {
        const response = await api.delete(
          `/api/patients/me/favorite-doctors/${doctorId}`
        );
        if (!response.success) {
          setFavoriteDoctorIds(previousFavoriteIds);
          message.error("Không thể xóa khỏi danh sách ưa thích");
        } else {
          message.success("Đã xóa khỏi danh sách ưa thích");
        }
      } else {
        const response = await api.post("/api/patients/me/favorite-doctors", {
          doctorId: doctorId,
        });
        if (!response.success) {
          setFavoriteDoctorIds(previousFavoriteIds);
          message.error(
            response.message || "Không thể thêm vào danh sách ưa thích"
          );
        } else {
          message.success("Đã thêm vào danh sách ưa thích");
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setFavoriteDoctorIds(previousFavoriteIds);
      message.error("Có lỗi xảy ra khi cập nhật danh sách ưa thích");
    } finally {
      setFavoriteLoadingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doctorId);
        return newSet;
      });
    }
  };

  return {
    favoriteDoctorIds,
    favoriteLoadingIds,
    handleToggleFavorite,
  };
}
