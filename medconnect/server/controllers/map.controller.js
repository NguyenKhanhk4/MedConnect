import Location from "../models/location.model.js";

export const getLocations = async (req, res) => {
  try {
    const data = await Location.find().lean();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createLocation = async (req, res) => {
  try {
    const { name, lat, lng } = req.body;
    const newLoc = await Location.create({ name, lat, lng });
    res.status(201).json(newLoc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
