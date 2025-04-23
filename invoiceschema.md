Table "public.invoices"
      Column      |            Type             | Collation | Nullable |             
  Default
------------------+-----------------------------+-----------+----------+--------------------------------------
 id               | integer                     |           | not null | nextval('invoices_id_seq'::regclass)
 appointment_id   | integer                     |           |          |
 craftsman_id     | integer                     |           |          |
 customer_id      | integer                     |           |          |
 invoice_number   | character varying(50)       |           |          |
 amount           | numeric(10,2)               |           | not null |
 tax_amount       | numeric(10,2)               |           |          | 0
 total_amount     | numeric(10,2)               |           | not null |
 status           | character varying(20)       |           |          | 'pending'::character varying
 payment_link     | character varying(255)      |           |          |
 created_at       | timestamp without time zone |           |          | CURRENT_TIMESTAMP
 updated_at       | timestamp without time zone |           |          | CURRENT_TIMESTAMP
 due_date         | timestamp without time zone |           |          |
 notes            | text                        |           |          |
 type             | invoice_type_enum           |           | not null | 'invoice'::invoice_type_enum
 service_date     | date                        |           |          | 
 location         | text                        |           |          |
 vat_exempt       | boolean                     |           | not null | false       
 payment_deadline | interval                    |           | not null | '16 days'::interval
Indexes:
    "invoices_pkey" PRIMARY KEY, btree (id)
    "idx_invoices_type" btree (type)
    "invoices_invoice_number_key" UNIQUE CONSTRAINT, btree (invoice_number)
Check constraints:
    "check_status_value" CHECK (status::text = ANY (ARRAY['pending'::character varying, 'paid'::character varying, 'overdue'::character varying, 'cancelled'::character varying, 'draft'::character varying]::text[]))
Foreign-key constraints:
    "invoices_appointment_id_fkey" FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    "invoices_craftsman_id_fkey" FOREIGN KEY (craftsman_id) REFERENCES craftsmen(id) 
    "invoices_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id)   
Referenced by:
    TABLE "invoice_items" CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id)
Triggers:
    generate_invoice_number BEFORE INSERT ON invoices FOR EACH ROW WHEN (new.invoice_number IS NULL OR new.invoice_number::text = ''::text) EXECUTE FUNCTION generate_invoice_number()

      trigger_name       | event_manipulation |              action_statement        

-------------------------+--------------------+--------------------------------------------
 generate_invoice_number | INSERT             | EXECUTE FUNCTION generate_invoice_number()
(1 row)

         proname         |                                                           
        prosrc
-------------------------+---------------------------------------------------------------------------------------------------------------------------------------------   
 generate_invoice_number |                                                           
                                                                                 +   
                         | DECLARE                                                   
                                                                                 +   
                         |   year_prefix TEXT;                                       
                                                                                 +   
                         |   last_number INTEGER;                                    
                                                                                 +   
                         |   new_number TEXT;                                        
                                                                                 +   
                         | BEGIN                                                     
                                                                                 +   
                         |   -- Get the current year                                 
                                                                                 +   
                         |   year_prefix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;                                                                                    +   
                         |                                                           
                                                                                 +   
                         |   -- Find the highest invoice number for this year                                                                                         +   
                         |   EXECUTE format('SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM ''%s-(\d+)'')), 0) FROM invoices WHERE invoice_number LIKE ''%s-%%''', +   
                         |                  year_prefix, year_prefix)                
                                                                                 +   
                         |   INTO last_number;                                       
                                                                                 +
                         |                                                           
                                                                                 +   
                         |   -- Generate the new number with padding                 
                                                                                 +   
                         |   new_number := year_prefix || '-' || LPAD((last_number + 1)::TEXT, 3, '0');                                                               +   
                         |                                                           
                                                                                 +   
                         |   -- Set the new invoice number                           
                                                                                 +   
                         |   NEW.invoice_number := new_number;                       
                                                                                 +   
                         |                                                           
                                                                                 +   
                         |   RETURN NEW;                                             
                                                                                 +   
                         | END;                                                      
                                                                                 +   
                         |
(1 row)

 id | appointment_id | craftsman_id | customer_id |  invoice_number   | amount  | tax_amount | total_amount | status  | payment_link |         created_at         |         updated_at         |        due_date         |  notes  |  type   | service_date | location | vat_exempt | payment_deadline
----+----------------+--------------+-------------+-------------------+---------+------------+--------------+---------+--------------+----------------------------+----------------------------+-------------------------+---------+---------+--------------+----------+------------+------------------
  1 |              6 |            8 |           1 | INV-1744563433204 | 1000.00 |       0.00 |      1000.00 | pending |              | 2025-04-13 16:57:13.235791 | 2025-04-13 16:57:13.235791 |                         |         | invoice |              |          | f          | 16 days
  2 |             14 |            8 |          19 | INV-1744575396744 |  500.00 |       0.00 |       500.00 | pending |              | 2025-04-13 20:16:36.779132 | 2025-04-13 20:16:36.779132 | 2025-04-14 00:00:00     | testing | invoice |              |          | f          | 16 days
  3 |             15 |           17 |          25 | INV-1744576991153 | 5504.00 |       0.00 |      5504.00 | pending |              | 2025-04-13 20:43:11.189036 | 2025-04-13 20:43:11.189036 | 2025-04-30 00:00:00     |         | invoice |              |          | f          | 16 days
  4 |             17 |           12 |          21 | INV-1744666971015 | 5555.00 |       0.00 |      5555.00 | pending |              | 2025-04-14 21:42:48.486258 | 2025-04-14 21:42:48.486258 | 2025-04-28 21:42:51.015 |         | invoice |              |          | f          | 16 days
  5 |             18 |            8 |          27 | INV-1744817001971 |  289.00 |       0.00 |       289.00 | pending |              | 2025-04-16 15:23:13.834287 | 2025-04-16 15:23:13.834287 | 2025-04-30 15:23:21.971 |         | invoice |              |          | f          | 16 days
(5 rows)

   column_name    |          data_type
------------------+-----------------------------
 id               | integer
 appointment_id   | integer
 craftsman_id     | integer
 customer_id      | integer
 due_date         | timestamp without time zone
 type             | USER-DEFINED
 service_date     | date
 vat_exempt       | boolean
 payment_deadline | interval
 amount           | numeric
 tax_amount       | numeric
 total_amount     | numeric
 created_at       | timestamp without time zone
 updated_at       | timestamp without time zone
 invoice_number   | character varying
 payment_link     | character varying
 location         | text
 notes            | text
 status           | character varying
(19 rows)

         proname         |                                                           
        prosrc
-------------------------+---------------------------------------------------------------------------------------------------------------------------------------------   
                         |   EXECUTE format('SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM ''%s-(\d+)'')), 0) FROM invoices WHERE invoice_number LIKE ''%s-%%''', +        
                         |                  year_prefix, year_prefix)                                                                                                 +        
                         |   INTO last_number;                                                                                                                        +        
                         |                                                                                                                                            +        
                         |   -- Generate the new number with padding                                                                                                  +        
                         |   new_number := year_prefix || '-' || LPAD((last_number + 1)::TEXT, 3, '0');                                                               +        
                         |                                                                                                                                            +        
                         |   -- Set the new invoice number                                                                                                            +        
                         |   NEW.invoice_number := new_number;                                                                                                        +        
                         |                                                                                                                                            +        
                         |   RETURN NEW;                                                                                                                              +        
                         | END;                                                                                                                                       +        
                         |
(1 row)

postgres=>

