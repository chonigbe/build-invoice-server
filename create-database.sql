drop table line_items;
drop table invoices;
drop table recipients;

create table invoices(
    id VARCHAR(40) NOT NULL PRIMARY KEY,
    status ENUM('OPEN', 'SUBMITTED') NOT NULL,
    recipientId INT(40) NOT NULL,
    total INT NOT NULL,
    dueDate DATE
);

create table recipients(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE
);

create table line_items(
    id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
    invoiceId VARCHAR(40) NOT NULL,
    amount INT,
    description VARCHAR(1000),
    FOREIGN KEY (invoiceId) REFERENCES invoices(id)
);

INSERT INTO recipients (id, name, email) VALUES ('1', 'Celia', 'chonigbe@test.com');
INSERT INTO invoices (id, status, recipientId, total, dueDate) VALUES ('anyid', 'OPEN', '1', '11', '1992-12-30');
INSERT INTO line_items (id, invoiceId, amount, description) VALUES ('1', 'anyid', '11', 'THIS IS AN INVOICE');