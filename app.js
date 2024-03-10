const express = require("express");
const path = require("path");



const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();



app.use(express.json());



const databasePath = path.join(__dirname, "covid19IndiaPortal.db");



let database = null;



const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};



initializeDBAndServer();



const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};



const convertDistrictDbObjectResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};



const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};



app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const databaseUser = await db.get(selectUserQuery);
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});



app.get("/states/", authenticateToken, async (request, response) => {
  const getStatesQuery = `
   SELECT
    *
   FROM
    state;`;
  const statesArray = await database.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) =>
      convertStateDbObjectToResponseObject(eachState)
    )
  );
});



app.get("/states/:stateId", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStatesQuery = `
   SELECT
    *
   FROM
    state
   WHERE
    state_id = ${stateId};`;
  const state = await database.get(getStatesQuery);
  response.send(convertStateDbObjectToResponseObject(eachState));
});





app.get("/districts/:districtId/", authenticateToken, async (request, response) => {
    const { districtId } = request.params;



    const getDistrictQuery = `
    SELECT
        *
    FROM
        district
    WHERE
     district_id = ${districtId};`;
    const district = await database.get(getDistrictQuery);
    response.send(convertDistrictDbObjectResponseObject(district)
    );
});




app.post("/districts/", authenticateToken, async (request, response) => {
    const { stateId, districtName, cases, cured, deaths, active } = request.body;



    const postDistrictQuery = `
    INSERT INTO
        district(stateId, districtName, cases, cured, deaths, active)
    VALUES
        (${stateId}, '${districtName}', ${cases}, ${cured}, ${deaths}, ${active})
    WHERE
     district_id = ${districtId};`;
    await database.run(postDistrictQuery);
    response.send("District Successfully Added")
    );
});



app.delete("/districts/:districtId/", authenticateToken, async (request, response) => {
  const { districtId } = request.params;



  const deleteDistrictQuery = `
   DELETE FROM
    district
   WHERE
    district_id = ${districtId};`;
  await database.run(deleteDistrictQuery);
  response.send("District Removed")
    );
});




app.put("/districts/:districtId/", authenticateToken, async (request, response) => {
  const { districtId } = request.params;
  const { stateId, districtName, cases, cured, deaths, active } = request.body;



  const updateDistrictQuery = `
   UPDATE
    district
   SET
    state_Id = ${stateId},
    district_Name = '${districtName}',
    cases = ${cases},
    cured = ${cured}, 
    deaths = ${deaths}, 
    active = ${active})
   WHERE
    district_id = ${districtId};`;
  await database.run(updateDistrictQuery);
  response.send("District Details Updated");
});



app.get("/states/:stateId/stats/",authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateStatsQuery = `
            SELECT
                SUM(cases),
                SUM(cured),
                SUM(active),
                SUM(deaths),
            FROM district
            WHERE state_id = ${stateId};`;
  const stats = await database.get(getStateStatsQuery);
  response.send({
      totalCases: stats["SUM(cases)"],
      totalCured: stats["SUM(cured)"],
      totalActive: stats["SUM(active)"],
      totalDeaths: stats["SUM(deaths)"]
  });



});



module.exports = app;