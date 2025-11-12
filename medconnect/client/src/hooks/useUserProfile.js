import { useState, useEffect, useRef } from "react";
import { auth } from "../lib/firebase";
import { getCurrentUser, getCurrentPatientProfile } from "../lib/api";

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFetching = useRef(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      // Prevent multiple simultaneous calls
      if (isFetching.current) return;

      try {
        isFetching.current = true;
        setLoading(true);
        setError(null);

        // Get current user from Firebase
        const firebaseUser = auth.currentUser;

        if (!firebaseUser) {
          setUserProfile(null);
          setLoading(false);
          return;
        }

        // Try to fetch full patient profile first, fallback to basic user info
        let profileData = null;
        try {
          const patientResponse = await getCurrentPatientProfile();
          profileData = patientResponse?.data || patientResponse;
        } catch (patientError) {
          // Fallback to basic user info
          try {
            const userResponse = await getCurrentUser();
            profileData = userResponse?.data || userResponse;
          } catch (userError) {
            console.error("Failed to fetch user info:", userError);
            throw userError;
          }
        }

        // Combine Firebase user data with API profile data
        // Priority: Patient profile data > User data > Firebase data
        const combinedProfile = {
          uid: firebaseUser.uid,
          // Email: User data first, then Firebase
          email: profileData?.user?.email || firebaseUser.email,
          // Phone: Patient profile first, then user data, then Firebase
          phone:
            profileData?.profile?.phone ||
            profileData?.user?.phone ||
            firebaseUser.phoneNumber,
          // Display name: Patient profile first, then user data, then Firebase
          displayName:
            profileData?.profile?.fullName ||
            profileData?.user?.fullName ||
            firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: profileData?.user?.role,
          appUserId: profileData?.user?._id,
          // Additional profile fields
          fullName:
            profileData?.profile?.fullName ||
            profileData?.user?.fullName ||
            firebaseUser.displayName,
          avatar: profileData?.profile?.avatarUrl || firebaseUser.photoURL,
          avatarUrl: profileData?.profile?.avatarUrl || null,
          profileComplete: profileData?.profile?.isComplete || false,
          // Patient specific fields (from patient collection)
          dob: profileData?.profile?.dob,
          gender: profileData?.profile?.gender,
          nationalId: profileData?.profile?.nationalId,
          address: profileData?.profile?.address,
          wardCode: profileData?.profile?.wardCode,
          districtCode: profileData?.profile?.districtCode,
          provinceCode: profileData?.profile?.provinceCode,
          relationshipToOwner: profileData?.profile?.relationshipToOwner,
          // Blood type and allergy notes
          bloodType: profileData?.profile?.bloodType,
          allergyNotes: profileData?.profile?.allergyNotes,
          // Add any other fields from patient profile
          ...profileData?.profile,
        };

        setUserProfile(combinedProfile);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError(err.message);
        // Fallback to Firebase user data only
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            phone: firebaseUser.phoneNumber,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            fullName: firebaseUser.displayName,
            avatar: firebaseUser.photoURL,
            profileComplete: false,
          });
        }
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    };

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser && !isFetching.current) {
      try {
        isFetching.current = true;
        setLoading(true);

        // Try to fetch full patient profile first, fallback to basic user info
        let profileData = null;
        try {
          const patientResponse = await getCurrentPatientProfile();
          profileData = patientResponse?.data || patientResponse;
        } catch (patientError) {
          // Fallback to basic user info
          const userResponse = await getCurrentUser();
          profileData = userResponse?.data || userResponse;
        }

        const combinedProfile = {
          uid: firebaseUser.uid,
          // Email: User data first, then Firebase
          email: profileData?.user?.email || firebaseUser.email,
          // Phone: Patient profile first, then user data, then Firebase
          phone:
            profileData?.profile?.phone ||
            profileData?.user?.phone ||
            firebaseUser.phoneNumber,
          // Display name: Patient profile first, then user data, then Firebase
          displayName:
            profileData?.profile?.fullName ||
            profileData?.user?.fullName ||
            firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: profileData?.user?.role,
          appUserId: profileData?.user?._id,
          fullName:
            profileData?.profile?.fullName ||
            profileData?.user?.fullName ||
            firebaseUser.displayName,
          avatar: profileData?.profile?.avatarUrl || firebaseUser.photoURL,
          avatarUrl: profileData?.profile?.avatarUrl || null,
          profileComplete: profileData?.profile?.isComplete || false,
          // Patient specific fields (from patient collection)
          dob: profileData?.profile?.dob,
          gender: profileData?.profile?.gender,
          nationalId: profileData?.profile?.nationalId,
          address: profileData?.profile?.address,
          wardCode: profileData?.profile?.wardCode,
          districtCode: profileData?.profile?.districtCode,
          provinceCode: profileData?.profile?.provinceCode,
          relationshipToOwner: profileData?.profile?.relationshipToOwner,
          // Blood type and allergy notes
          bloodType: profileData?.profile?.bloodType,
          allergyNotes: profileData?.profile?.allergyNotes,
          // Add any other fields from patient profile
          ...profileData?.profile,
        };

        setUserProfile(combinedProfile);
        setError(null);
      } catch (err) {
        console.error("Error refreshing user profile:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    }
  };

  return {
    userProfile,
    loading,
    error,
    refreshProfile,
  };
}
