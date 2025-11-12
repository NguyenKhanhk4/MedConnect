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
          console.log("🔍 useUserProfile - API Response:", profileData);
          console.log(
            "🔍 useUserProfile - Profile data:",
            profileData?.profile
          );
        } catch (patientError) {
          console.error(
            "❌ useUserProfile - Failed to fetch patient profile:",
            patientError
          );
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
        // Always create a new object to ensure React detects the change
        const combinedProfile = {
          uid: firebaseUser.uid,
          // Email: User data first, then Firebase
          email: profileData?.user?.email || firebaseUser.email || "",
          // Phone: Patient profile first, then user data, then Firebase
          phone:
            profileData?.profile?.phone ||
            profileData?.user?.phone ||
            firebaseUser.phoneNumber ||
            "",
          // Display name: Patient profile first, then user data, then Firebase
          displayName:
            profileData?.profile?.fullName ||
            profileData?.user?.fullName ||
            firebaseUser.displayName ||
            "",
          photoURL: firebaseUser.photoURL || "",
          role: profileData?.user?.role || "",
          appUserId: profileData?.user?._id || "",
          fullName:
            profileData?.profile?.fullName ||
            profileData?.user?.fullName ||
            firebaseUser.displayName ||
            "",
          avatar:
            profileData?.profile?.avatarUrl || firebaseUser.photoURL || "",
          avatarUrl: profileData?.profile?.avatarUrl || null,
          profileComplete: profileData?.profile?.isComplete || false,
          // Patient specific fields (from patient collection)
          dob: profileData?.profile?.dob || null,
          gender: profileData?.profile?.gender || "",
          nationalId: profileData?.profile?.nationalId || null,
          address: profileData?.profile?.address || "",
          wardCode: profileData?.profile?.wardCode || null,
          districtCode: profileData?.profile?.districtCode || null,
          provinceCode: profileData?.profile?.provinceCode || null,
          relationshipToOwner:
            profileData?.profile?.relationshipToOwner || null,
          // Blood type and allergy notes
          bloodType: profileData?.profile?.bloodType || "",
          allergyNotes: profileData?.profile?.allergyNotes || "",
          // Explicitly include all fields from patient profile to ensure they're not lost
          ethnicity: profileData?.profile?.ethnicity || "",
          occupation: profileData?.profile?.occupation || "",
          citizenId: profileData?.profile?.citizenId || "",
          houseNumber: profileData?.profile?.houseNumber || "",
          representativeName: profileData?.profile?.representativeName || "",
          representativeCitizenId:
            profileData?.profile?.representativeCitizenId || "",
          representativeRelation:
            profileData?.profile?.representativeRelation || "",
          representativePhone: profileData?.profile?.representativePhone || "",
          medicalHistory: profileData?.profile?.medicalHistory || [],
          healthInsurance: profileData?.profile?.healthInsurance || "",
          healthInsuranceIssueDate:
            profileData?.profile?.healthInsuranceIssueDate || null,
          healthInsuranceExpiryDate:
            profileData?.profile?.healthInsuranceExpiryDate || null,
          notes: profileData?.profile?.notes || "",
        };

        // Always set a new object reference to trigger re-render
        // Use spread operator to create a new object
        const newProfile = { ...combinedProfile };
        // Ensure arrays are also new references
        if (newProfile.medicalHistory) {
          newProfile.medicalHistory = [...(newProfile.medicalHistory || [])];
        }
        console.log("✅ useUserProfile - Combined profile:", {
          fullName: newProfile.fullName,
          phone: newProfile.phone,
          address: newProfile.address,
          ethnicity: newProfile.ethnicity,
          occupation: newProfile.occupation,
          citizenId: newProfile.citizenId,
          houseNumber: newProfile.houseNumber,
          bloodType: newProfile.bloodType,
          allergyNotes: newProfile.allergyNotes,
          medicalHistory: newProfile.medicalHistory,
          dob: newProfile.dob,
          gender: newProfile.gender,
        });
        setUserProfile(newProfile);
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
    if (!firebaseUser) {
      return null;
    }

    if (isFetching.current) {
      // If already fetching, wait a bit and return current profile
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(userProfile);
        }, 100);
      });
    }

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

      // Always create a new object to ensure React detects the change
      const combinedProfile = {
        uid: firebaseUser.uid,
        // Email: User data first, then Firebase
        email: profileData?.user?.email || firebaseUser.email || "",
        // Phone: Patient profile first, then user data, then Firebase
        phone:
          profileData?.profile?.phone ||
          profileData?.user?.phone ||
          firebaseUser.phoneNumber ||
          "",
        // Display name: Patient profile first, then user data, then Firebase
        displayName:
          profileData?.profile?.fullName ||
          profileData?.user?.fullName ||
          firebaseUser.displayName ||
          "",
        photoURL: firebaseUser.photoURL || "",
        role: profileData?.user?.role || "",
        appUserId: profileData?.user?._id || "",
        fullName:
          profileData?.profile?.fullName ||
          profileData?.user?.fullName ||
          firebaseUser.displayName ||
          "",
        avatar: profileData?.profile?.avatarUrl || firebaseUser.photoURL || "",
        avatarUrl: profileData?.profile?.avatarUrl || null,
        profileComplete: profileData?.profile?.isComplete || false,
        // Patient specific fields (from patient collection)
        dob: profileData?.profile?.dob || null,
        gender: profileData?.profile?.gender || "",
        nationalId: profileData?.profile?.nationalId || null,
        address: profileData?.profile?.address || "",
        wardCode: profileData?.profile?.wardCode || null,
        districtCode: profileData?.profile?.districtCode || null,
        provinceCode: profileData?.profile?.provinceCode || null,
        relationshipToOwner: profileData?.profile?.relationshipToOwner || null,
        // Blood type and allergy notes
        bloodType: profileData?.profile?.bloodType || "",
        allergyNotes: profileData?.profile?.allergyNotes || "",
        // Explicitly include all fields from patient profile to ensure they're not lost
        ethnicity: profileData?.profile?.ethnicity || "",
        occupation: profileData?.profile?.occupation || "",
        citizenId: profileData?.profile?.citizenId || "",
        houseNumber: profileData?.profile?.houseNumber || "",
        representativeName: profileData?.profile?.representativeName || "",
        representativeCitizenId:
          profileData?.profile?.representativeCitizenId || "",
        representativeRelation:
          profileData?.profile?.representativeRelation || "",
        representativePhone: profileData?.profile?.representativePhone || "",
        medicalHistory: profileData?.profile?.medicalHistory || [],
        healthInsurance: profileData?.profile?.healthInsurance || "",
        healthInsuranceIssueDate:
          profileData?.profile?.healthInsuranceIssueDate || null,
        healthInsuranceExpiryDate:
          profileData?.profile?.healthInsuranceExpiryDate || null,
        notes: profileData?.profile?.notes || "",
      };

      // Always set a new object reference to trigger re-render
      // Use spread operator to create a new object
      const newProfile = { ...combinedProfile };
      // Ensure arrays are also new references
      if (newProfile.medicalHistory) {
        newProfile.medicalHistory = [...(newProfile.medicalHistory || [])];
      }
      console.log("✅ useUserProfile (refreshProfile) - Combined profile:", {
        fullName: newProfile.fullName,
        phone: newProfile.phone,
        address: newProfile.address,
        ethnicity: newProfile.ethnicity,
        occupation: newProfile.occupation,
        citizenId: newProfile.citizenId,
        houseNumber: newProfile.houseNumber,
        bloodType: newProfile.bloodType,
        allergyNotes: newProfile.allergyNotes,
        medicalHistory: newProfile.medicalHistory,
        dob: newProfile.dob,
        gender: newProfile.gender,
      });
      setUserProfile(newProfile);
      setError(null);

      // Return the profile for potential use by callers
      return newProfile;
    } catch (err) {
      console.error("Error refreshing user profile:", err);
      setError(err.message);
      // Return current profile on error instead of throwing
      return userProfile;
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  };

  return {
    userProfile,
    loading,
    error,
    refreshProfile,
  };
}
