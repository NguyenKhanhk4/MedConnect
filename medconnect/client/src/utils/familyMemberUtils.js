/**
 * Utility functions for processing family members
 */

/**
 * Process and group family members
 * @param {Array} members - Raw family members from API
 * @returns {Array} Processed and grouped family members
 */
export function processFamilyMembers(members) {
  // Filter out "self" (chỉ hiển thị người thân, không hiển thị bản thân)
  const familyOnly = members.filter(
    (member) => member.relationshipToOwner !== "self"
  );

  // Group all Patient records by fullName + relationshipToOwner
  const groupedMap = new Map();
  familyOnly.forEach((member) => {
    const key = `${member.fullName}_${member.relationshipToOwner}`;
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        _id: member._id,
        fullName: member.fullName,
        dob: member.dob,
        gender: member.gender,
        relationshipToOwner: member.relationshipToOwner,
        phone: member.phone,
        avatarUrl: member.avatarUrl,
        allPatientIds: [member._id.toString()],
      });
    } else {
      const existing = groupedMap.get(key);
      const memberId = member._id.toString();
      if (!existing.allPatientIds.includes(memberId)) {
        existing.allPatientIds.push(memberId);
      }
      // Giữ bản ghi mới nhất (có _id lớn hơn)
      const existingId = existing._id?.toString() || "";
      const currentId = member._id?.toString() || "";
      if (currentId > existingId) {
        existing._id = member._id;
        existing.dob = member.dob;
        existing.gender = member.gender;
        existing.phone = member.phone;
        existing.avatarUrl = member.avatarUrl;
      }
    }
  });

  const uniqueFamilyMembers = Array.from(groupedMap.values());

  // Sort by relationship order
  const relationshipOrder = {
    father: 1,
    mother: 2,
    spouse: 3,
    child: 4,
    grandparent: 5,
    other: 6,
  };

  uniqueFamilyMembers.sort((a, b) => {
    const orderA = relationshipOrder[a.relationshipToOwner] || 99;
    const orderB = relationshipOrder[b.relationshipToOwner] || 99;
    return orderA - orderB;
  });

  return uniqueFamilyMembers;
}

/**
 * Get relationship text in Vietnamese
 * @param {string} relationship - Relationship key
 * @returns {string} Relationship text in Vietnamese
 */
export function getRelationshipText(relationship) {
  const relationMap = {
    father: "Cha",
    mother: "Mẹ",
    spouse: "Vợ/Chồng",
    child: "Con",
    grandparent: "Ông/Bà",
    other: "Khác",
  };
  return relationMap[relationship] || relationship;
}
