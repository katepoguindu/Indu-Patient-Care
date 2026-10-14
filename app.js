require("dotenv").config();
const express = require("express");
const mysql = require("mysql8");
const path = require("path");

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }

    console.log("MySQL Database Connected Successfully!");
});

// Home Page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Insert Patient
app.post("/insert", (req, res) => {
    console.log("Patient form data received:", req.body);

    const { name, email, phone, gender, age, problem } = req.body;

    // Check required fields
    if (!name || !email || !phone || !gender ||
        age === undefined || age === "" || !problem) {
        return res.status(400).send(`
            <h2>All patient fields are required!</h2>
            <a href="/insert.html">Go Back</a>
        `);
    }

    const sql = `
        INSERT INTO patients
        (name, email, phone, gender, age, problem)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, email, phone, gender, Number(age), problem],
        (err, result) => {
            if (err) {
                console.error("INSERT ERROR:", err);

                return res.status(500).send(`
                    <h2>Error Adding Patient</h2>
                    <p>${err.message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                    <a href="/insert.html">Try Again</a><br><br>
                    <a href="/">Home</a>
                `);
            }

            console.log("Patient inserted successfully. ID:", result.insertId);

            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Patient Registered</title>
                    <link rel="stylesheet" href="/style.css">
                </head>
                <body>
                    <div class="form-container">
                        <h2>Patient Registered Successfully!</h2>
                        <p>Patient ID: ${result.insertId}</p>
                        <a href="/insert.html">Add Another Patient</a><br><br>
                        <a href="/list.html">View Patients</a><br><br>
                        <a href="/">Home</a>
                    </div>
                </body>
                </html>
            `);
        }
    );
});


// Update Patient
app.post("/update", (req, res) => {
    const {
        patient_id,
        name,
        email,
        phone,
        gender,
        age,
        problem
    } = req.body;

    if (!patient_id || !name || !email || !phone ||
        !gender || age === "" || age === undefined || !problem) {
        return res.status(400).send("Please fill in all patient fields.");
    }

    const sql = `
        UPDATE patients
        SET name = ?, email = ?, phone = ?, gender = ?, age = ?, problem = ?
        WHERE patient_id = ?
    `;

    db.query(
        sql,
        [name, email, phone, gender, Number(age), problem, patient_id],
        (err, result) => {
            if (err) {
                console.error("UPDATE ERROR:", err);
                return res.status(500).send("Unable to update patient. Please try again.");
            }

            if (result.affectedRows === 0) {
                return res.status(404).send(
                    "Patient ID not found or no changes were made."
                );
            }

            res.send("Patient Updated Successfully!");
        }
    );
});


// Delete Patient
app.post("/delete", (req, res) => {
    const { patient_id } = req.body;

    if (!patient_id || !Number.isInteger(Number(patient_id)) ||
        Number(patient_id) < 1) {
        return res.status(400).send("Please enter a valid Patient ID.");
    }

    const sql = "DELETE FROM patients WHERE patient_id = ?";

    db.query(sql, [Number(patient_id)], (err, result) => {
        if (err) {
            console.error("DELETE ERROR:", err);
            return res.status(500).send("Unable to delete patient. Please try again.");
        }

        if (result.affectedRows === 0) {
            return res.status(404).send("Patient ID not found!");
        }

        res.send("Patient Deleted Successfully!");
    });
});

// View One Patient by ID
app.get("/patients/:id", (req, res) => {
    const patientId = req.params.id;

    const sql = "SELECT * FROM patients WHERE patient_id = ?";

    db.query(sql, [patientId], (err, results) => {
        if (err) {
            console.error("FETCH ONE ERROR:", err);
            return res.status(500).json({
                message: "Error fetching patient details"
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Patient ID not found!"
            });
        }

        res.json(results[0]);
    });
});

// View All Patients
app.get("/patients", (req, res) => {
    db.query("SELECT * FROM patients", (err, results) => {
        if (err) {
            console.error("FETCH ALL ERROR:", err);
            return res.status(500).send("Error fetching patients");
        }

        res.json(results);
    });
});

// Start Server
app.listen(3000, () => {
    console.log("Patient Management Server running on port 3000");
});
