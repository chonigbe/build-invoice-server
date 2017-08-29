const express = require("express"),
    http = require("http"),
    parser = require("body-parser"),
    mysql = require("mysql");

const connection = mysql.createConnection({
    host: "localhost",
    user: "invoice_app",
    password: "huZvOltetsvfuCLoBQEfxdKKiAybbAjhNke",
    database: "invoice_db"
});

try {
    connection.connect();
} catch (e) {
    console.log("Database Connetion failed:" + e);
}

connection.query("SELECT 1 + 1 AS solution", function(err, rows, fields) {
    if (err) throw err;

    console.log("The solution is: ", rows[0].solution);
});

// connection.end();
const app = express();
app.use(parser.json());
app.use(parser.urlencoded({extended: true}));
app.set("port", process.env.PORT || 2000);

app.get("/", function(req, res) {
    res.send("<html><body><p>Welcome to Invoice App API</p></body></html>");
});

function validateInvoice(body) {
    if (
        typeof body.id !== "undefined" &&
        typeof body.status !== "undefined" &&
        typeof body.total !== "undefined" &&
        typeof body.recipient !== "undefined" &&
        typeof body.lineItems !== "undefined" &&
        typeof body.dueDate !== "undefined"
    ) {
        return true;
    }
    return false;
}

function validateRecipient(recipient) {
    if (typeof recipient.email !== "undefined" && typeof recipient.name !== "undefined") {
        return true;
    }
    return false;
}

function getRecipientId(email, name, callback) {
    console.log("Checking for pre-exiting recipient");
    connection.query(
        "SELECT id from recipients where email = ? AND name = ?",
        [email, name],
        function(err, result) {
            if (err) {
                console.log("Error on checking for pre-exiting recipient");
                callback(err, null);
            } else if (result[0]) {
                console.log("Found pre-exiting recipient");
                callback(null, result[0].id);
            } else {
                console.log("Didn't find pre-exiting recipient");
                callback(null, null);
            }
        }
    );
}

function insertLineItems(lineItemData, id, res, response, callback) {
    console.log("Begin inserting lineItems");
    lineItemData.forEach(function(lineItem) {
        connection.query(
            "INSERT INTO line_items (amount, description, invoiceId) VALUES (?, ?, ?)",
            [lineItem.amount, lineItem.description, id],
            function(err, results) {
                if (err) {
                    console.log(`Failed inserting lineItem: ${lineItem}`);
                    callback(err, null);
                }
            }
        );
    });
    console.log("completed inserting line items");
    callback(null, null);
}

function returnError(res, response, msg) {
    console.log(msg);
    response.push({
        result: "error",
        msg: msg
    });
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(JSON.stringify(response));
}

function insertInvoice(body, res, response, callback) {
    console.log("attempting to insert invoice");
    connection.query(
        "INSERT INTO invoices (id, status, recipientId, total, dueDate) VALUES (?, ?, (SELECT id from recipients WHERE email=?), ?, ?)",
        [body.id, body.status, body.recipient.email, body.total, body.dueDate],
        function(err, result) {
            console.log("Inserted invoice");
            if (!err) {
                if (result.affectedRows != 0) {
                    insertLineItems(body.lineItems, body.id, res, response, function(err, data) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, data);
                        }
                    });
                }
            } else {
                console.log(err);
                returnError(res, response, "Failed to add, please look at your invoice data");
            }
        }
    );
}

app.post("/invoice/add", function(req, res) {
    let response = [];
    console.log("request body:", req.body);
    console.log("checking invoice");
    if (validateInvoice(req.body)) {
        console.log("invoice valid");
        console.log("checking recipient");
        if (validateRecipient(req.body.recipient)) {
            console.log("recipient valid");
            getRecipientId(req.body.recipient.email, req.body.recipient.name, function(err, data) {
                if (err) {
                    returnError(res, response, "Something went wrong gettng the receipt Id");
                } else if (!data) {
                    connection.query(
                        "INSERT INTO recipients (name, email) VALUES (?, ?)",
                        [req.body.recipient.name, req.body.recipient.email],
                        function(err, result) {
                            if (!err) {
                                if (result != 0) {
                                    insertInvoice(req.body, res, response, function(err, data) {
                                        if (err) {
                                            returnError(
                                                res,
                                                response,
                                                "Something went wrong inserting invoice"
                                            );
                                        } else {
                                            response.push({result: "success"});
                                            res.setHeader("Content-Type", "application/json");
                                            res.status(200).send(JSON.stringify(response));
                                        }
                                    });
                                } else {
                                    returnError(
                                        res,
                                        response,
                                        "Failed to add, please look at your recipient data"
                                    );
                                }
                            } else {
                                res.status(400).send(err);
                            }
                        }
                    );
                } else {
                    insertInvoice(req.body, res, response, function(err, data) {
                        if (err) {
                            console.log(err);
                            returnError(
                                res,
                                response,
                                "Something went wrong inserting invoice or lineItems"
                            );
                        } else {
                            console.log("Invoice add SUCESS!!!");
                            response.push({result: "success"});
                            res.setHeader("Content-Type", "application/json");
                            res.status(200).send(JSON.stringify(response));
                        }
                    });
                }
            });
        } else {
            console.log("recipient invalid :(");
            returnError(res, response, "Please send the recipient object with name, email");
        }
    } else {
        console.log("invoice invalid :(");
        returnError(
            res,
            response,
            "Invoice object is missing id, status, recipient, lineItems, dueDate or total."
        );
    }
});

http.createServer(app).listen(app.get("port"), function() {
    console.log("Server listening on port " + app.get("port"));
});
