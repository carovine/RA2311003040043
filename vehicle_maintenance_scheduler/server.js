import express from "express";
import dotenv from "dotenv";
import Log from "../logging_middleware/logger.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

let depots = [];
let vehicles = [];

let todaySchedule = [];

const getDepots = async () => {
  try {
    const response = await fetch(`${PORT}/depots`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${process.env.API_KEY}`,
        body: process.env.Authorization_json
          ? JSON.stringify(process.env.Authorization_json)
          : null,
      },
    });
    const data = await response.json();
    depots = await data.depots; // Storing the fetched depots
  } catch (error) {
    Log(
      "backend",
      "error",
      "service",
      `Error fetching depots: ${error.message}`,
    );
  }
};

const getVehicles = async () => {
  try {
    const response = await fetch(`${PORT}/vehicles`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${process.env.API_KEY}`,
        body: process.env.Authorization_json
          ? JSON.stringify(process.env.Authorization_json)
          : null,
      },
    });
    const data = await response.json();
    vehicles = await data.vehicles; // Storing the fetched vehicles
    sortVehiclesByImpact(); // Sorting vehicles by impact when the server starts
  } catch (error) {
    Log(
      "backend",
      "error",
      "service",
      `Error fetching vehicles: ${error.message}`,
    );
  }
};

const sortVehiclesByImpact = () => {
  vehicles.sort((a, b) => b.impact - a.impact);
  todayVehicleSubset(); // Calculating today's vehicle subset when the server starts
};

const todaysMechanicHours = () => {
  try {
    let totalHours = 0;
    for (const depot of depots) {
      totalHours += depot.MechanicHours;
    }
    return totalHours;
  } catch (error) {
    Log(
      "backend",
      "error",
      "service",
      `Error calculating today's mechanic hours: ${error.message}`,
    );
  }
};

const todayVehicleSubset = () => {
  try {
    const mechanicHours = todaysMechanicHours();
    let hoursUsed = 0;
    let i = 0;
    while (hoursUsed < mechanicHours && i < vehicles.length) {
      const vehicle = vehicles[i];
      if (hoursUsed + vehicle.Duration <= mechanicHours) {
        todaySchedule.push(vehicle);
        hoursUsed += vehicle.Duration;
      }
      i++;
    }
  } catch (error) {
    Log(
      "backend",
      "error",
      "service",
      `Error calculating today's vehicle subset: ${error.message}`,
    );
  }
};

app.listen(PORT, () => {
  getDepots(); // Fetching depots when the server starts
  getVehicles(); // Fetching vehicles when the server starts
});
