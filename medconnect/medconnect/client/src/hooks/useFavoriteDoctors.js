import { useState, useEffect } from "react";
import { message } from "antd";
import { api } from "../lib/api";

/**
 * Custom hook for managing favorite doctors
 * @returns {Object} { favoriteDoctors, loading, removingIds, fetchFavoriteDoctors, handleRemoveFavorite }
 */
export function useFavoriteDoctors() {
  const [loading, setLoading] = useState(true);
  const [favoriteDoctors, setFavoriteDoctors] = useState([]);
  const [removingIds, setRemovingIds] = useState(new Set());

  const fetchFavoriteDoctors = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/patients/me/favorite-doctors");

      if (response.success) {
        setFavoriteDoctors(response.data.favoriteDoctors || []);
      } else {
        message.error("Không thể tải danh sách bác sĩ ưa thích");
      }
    } catch (error) {
      console.error("Error fetching favorite doctors:", error);
      message.error("Có lỗi xảy ra khi tải danh sách bác sĩ ưa thích");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (doctorId) => {
    try {
      setRemovingIds((prev) => new Set(prev).add(doctorId));
      const response = await api.delete(
        `/api/patients/me/favorite-doctors/${doctorId}`
      );

      if (response.success) {
        message.success("Đã xóa khỏi danh sách ưa thích");
        setFavoriteDoctors((prev) =>
          prev.filter((doctor) => doctor._id !== doctorId)
        );
      } else {
        message.error(
          response.message || "Không thể xóa bác sĩ khỏi danh sách"
        );
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
      message.error("Có lỗi xảy ra khi xóa bác sĩ khỏi danh sách");
    } finally {
      setRemovingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(doctorId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchFavoriteDoctors();
  }, []);

  return {
    favoriteDoctors,
    loading,
    removingIds,
    fetchFavoriteDoctors,
    handleRemoveFavorite,
  };
}
