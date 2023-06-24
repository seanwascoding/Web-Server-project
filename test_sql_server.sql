CREATE TABLE account (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password VARCHAR(50) NOT NULL,
  /* email VARCHAR(100) NOT NULL, */
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

USE test;
ALTER TABLE account
ADD is_active BOOLEAN DEFAULT false;


SHOW TABLES;
DESCRIBE account;

USE test;
SELECT * FROM account;


INSERT INTO account (username, password)
VALUES ('test', 'password');
       

DELETE FROM account;