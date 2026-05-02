import express from "express";
import dotenv from "dotenv";

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
    console.log(data);
    depots = await data.depots; // Storing the fetched depots
    console.log("depots:\n", depots);
  } catch (error) {
    console.error("Error fetching depots:", error);
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
    console.log("vehicles:\n", vehicles);
    sortVehiclesByImpact(); // Sorting vehicles by impact when the server starts
  } catch (error) {
    console.error("Error fetching vehicles:", error);
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
    console.error("Error calculating today's mechanic hours:", error);
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
    console.log("final subset", todaySchedule);
  } catch (error) {
    console.error("Error calculating today's vehicle subset:", error);
  }
};

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  getDepots(); // Fetching depots when the server starts
  getVehicles(); // Fetching vehicles when the server starts
});
