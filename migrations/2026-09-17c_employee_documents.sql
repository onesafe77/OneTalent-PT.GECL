CREATE TABLE IF NOT EXISTS "employee_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" varchar NOT NULL,
	"jenis" varchar(20) NOT NULL,
	"keterangan" text,
	"berkas_id" varchar NOT NULL,
	"nama_berkas" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"ukuran" integer NOT NULL,
	"diunggah_oleh" text,
	"dibuat" timestamp with time zone DEFAULT now()
);
DO $$ BEGIN
  ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "idx_employee_documents_karyawan" ON "employee_documents" USING btree ("employee_id","jenis");
