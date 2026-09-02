#!/usr/bin/env python3
"""
==============================================================================
CampusGenie Databricks Policy PDF Generator & UC Volume Staging Pipeline
==============================================================================
Generates authentic institutional policy and rulebook PDF documents
and stages them into Databricks Unity Catalog Volume:
  /Volumes/campusgenie/docs/policies/*.pdf

Documents generated:
  - POL-OD-2025.pdf   : General Regulations on On-Duty (OD) Leave
  - POL-IP-2025.pdf   : Campus IP & Hackathon Project Ownership Code
  - POL-CODE-2025.pdf : Hackathon Code of Conduct & Academic Integrity
  - POL-REIMB-2025.pdf: Student Travel Grant & Reimbursement Policy
  - POL-PERM-2025.pdf : Off-Campus Event Permission & Attendance Waiver
  - POL-ELIG-2025.pdf : Competition Eligibility & Academic Standing
==============================================================================
"""

import os
import sys
import argparse
import subprocess
from datetime import datetime

# ==============================================================================
# 1. Policy Documents Corpus Definition
# ==============================================================================

POLICIES = [
    {
        "doc_id": "POL-OD-2025",
        "title": "Bangalore Technical Universities General Regulations on On-Duty (OD) Leave",
        "authority": "Consortium of Bangalore Engineering Institutes & Autonomous Colleges",
        "effective_date": "January 1, 2025",
        "category": "Attendance & Leave Regulations",
        "clauses": [
            {
                "number": "Clause 4.1",
                "heading": "Eligibility for On-Duty (OD) Leave",
                "text": (
                    "A student maintaining a minimum cumulative class attendance of 75% prior to "
                    "the event date is eligible to apply for up to three (3) consecutive working days "
                    "of On-Duty (OD) leave per semester for recognized collegiate hackathons, technical "
                    "conferences, or inter-university competitions."
                ),
            },
            {
                "number": "Clause 4.2",
                "heading": "Mandatory Prior Written Permission",
                "text": (
                    "To claim OD attendance waiver, the student must submit an official permission letter "
                    "signed by the Faculty Advisor and Head of Department (HoD) at least forty-eight (48) "
                    "hours before the event commencement."
                ),
            },
            {
                "number": "Clause 4.3",
                "heading": "Participation Verification Requirement",
                "text": (
                    "Upon returning, the student must produce a verified Certificate of Participation or "
                    "verified Attendance Record issued by the organizing body within three (3) working days "
                    "to confirm attendance credit."
                ),
            },
            {
                "number": "Clause 4.4",
                "heading": "Semester Cumulative Cap",
                "text": (
                    "The cumulative On-Duty leave granted to any student across all extracurricular technical, "
                    "sports, and cultural events shall not exceed six (6) total working days per academic semester "
                    "without special written sanction from the Dean of Academic Affairs."
                ),
            },
            {
                "number": "Clause 4.5",
                "heading": "Examination Period Exclusion",
                "text": (
                    "On-Duty leave shall not be granted for dates coinciding with internal continuous assessment "
                    "tests (CIE), laboratory practical examinations, or semester-end examinations (SEE)."
                ),
            },
        ],
    },
    {
        "doc_id": "POL-IP-2025",
        "title": "Campus Intellectual Property & Hackathon Project Ownership Code",
        "authority": "Institutional Research & Innovation Council (IRIC)",
        "effective_date": "January 1, 2025",
        "category": "Intellectual Property & Innovation",
        "clauses": [
            {
                "number": "Clause 8.1",
                "heading": "Student Ownership of Hackathon Creations",
                "text": (
                    "All source code, software prototypes, designs, algorithms, and intellectual property conceived "
                    "and created solely by students during hackathons, workshops, or extracurricular innovation "
                    "challenges belong 100% to the student team members."
                ),
            },
            {
                "number": "Clause 8.2",
                "heading": "Sponsor and Organizer License Restrictions",
                "text": (
                    "Event sponsors and host colleges may retain non-exclusive rights to showcase, demonstrate, "
                    "and archive project submissions for evaluation and promotional purposes, but acquire no equity, "
                    "proprietary license, or patent rights without explicit written student consent."
                ),
            },
            {
                "number": "Clause 8.3",
                "heading": "Open Source and Foundation Model Attribution",
                "text": (
                    "Student projects utilizing third-party open-source libraries or hosted foundation model APIs "
                    "(e.g. Databricks DBRX, OpenAI, Anthropic, HuggingFace) must maintain proper licensing attribution "
                    "and declare dependencies in the project repository."
                ),
            },
        ],
    },
    {
        "doc_id": "POL-CODE-2025",
        "title": "Inter-Collegiate Hackathon Code of Conduct & Academic Integrity Code",
        "authority": "Consortium of Bangalore Engineering Institutes",
        "effective_date": "January 1, 2025",
        "category": "Ethics & Academic Integrity",
        "clauses": [
            {
                "number": "Clause 2.1",
                "heading": "Pre-existing Work Disclosure",
                "text": (
                    "All projects submitted for judging must be developed during the designated hackathon hack period. "
                    "Third-party open-source libraries and public foundation models (e.g., HuggingFace, Databricks DBRX, "
                    "OpenAI APIs) are permitted provided they are disclosed in the project readme."
                ),
            },
            {
                "number": "Clause 2.2",
                "heading": "Academic Integrity & Plagiarism Prohibition",
                "text": (
                    "Submitting unoriginal code, pre-built proprietary software without disclosure, or misrepresenting "
                    "another party's work as original student creation constitutes an ethics violation resulting in "
                    "immediate disqualification and academic reporting."
                ),
            },
            {
                "number": "Clause 2.3",
                "heading": "Inclusive & Harassment-Free Environment",
                "text": (
                    "All participants, mentors, judges, and organizers are entitled to a safe, respectful, and harassment-free "
                    "environment regardless of gender, sexual orientation, disability, physical appearance, race, or religion."
                ),
            },
        ],
    },
    {
        "doc_id": "POL-REIMB-2025",
        "title": "Student Travel Grant & Competitive Representation Reimbursement Policy",
        "authority": "Student Welfare & Development Directorate",
        "effective_date": "January 1, 2025",
        "category": "Financial Grants & Travel",
        "clauses": [
            {
                "number": "Clause 5.1",
                "heading": "Travel and Registration Grants",
                "text": (
                    "Teams selected for finals of national-level hackathons with prize pools exceeding INR 1,00,000 "
                    "are eligible for up to 100% travel reimbursement (second sleeper train/bus fare) and entry fee "
                    "waiver subject to Dean approval."
                ),
            },
            {
                "number": "Clause 5.2",
                "heading": "Reimbursement Claim Procedure & Timelines",
                "text": (
                    "Students must submit official expense receipts, boarding passes, registration invoices, and the "
                    "event participation certificate to the Finance Office within fourteen (14) calendar days of event conclusion."
                ),
            },
            {
                "number": "Clause 5.3",
                "heading": "Prize Money and Grant Deductions",
                "text": (
                    "Institutional travel grants are non-taxable student welfare allowances and are not deducted from "
                    "any prize money won by the student team at the competition."
                ),
            },
        ],
    },
    {
        "doc_id": "POL-PERM-2025",
        "title": "Institutional Off-Campus Event Permission & Attendance Waiver Protocol",
        "authority": "Office of the Dean (Student Affairs)",
        "effective_date": "January 1, 2025",
        "category": "Permissions & Student Safety",
        "clauses": [
            {
                "number": "Clause 3.1",
                "heading": "Off-Campus Event Permission Form Requirement",
                "text": (
                    "All students attending external hackathons, bootcamps, tech talks, or conferences outside their "
                    "home campus must obtain signed permission from their Faculty Mentor and Department Chairperson prior to departure."
                ),
            },
            {
                "number": "Clause 3.2",
                "heading": "Parental Consent for Overnight and Multi-Day Off-Campus Events",
                "text": (
                    "For multi-day hackathons requiring overnight stay at outside venues, students residing in university hostels "
                    "or under 21 years of age must submit written parental / guardian consent to the Chief Warden / Department Office."
                ),
            },
            {
                "number": "Clause 3.3",
                "heading": "Safety and Emergency Contact Declaration",
                "text": (
                    "Participating teams must provide emergency contact information and the official organizer contact details "
                    "to the college security office prior to departure."
                ),
            },
        ],
    },
    {
        "doc_id": "POL-ELIG-2025",
        "title": "Consortium Regulations on Student Competition Eligibility & Academic Standing",
        "authority": "Academic Council & Board of Studies",
        "effective_date": "January 1, 2025",
        "category": "Academic Standing & Eligibility",
        "clauses": [
            {
                "number": "Clause 1.1",
                "heading": "Undergraduate Class Standing & Semester Requirements",
                "text": (
                    "First-year through final-year BTech/BE students in good academic standing are eligible for open collegiate "
                    "events. Events categorized as '2nd year+ engineering students' require completion of at least two (2) academic "
                    "semesters of foundational coursework."
                ),
            },
            {
                "number": "Clause 1.2",
                "heading": "Inter-Disciplinary and Cross-Department Team Formation",
                "text": (
                    "Students are actively encouraged to form inter-disciplinary teams comprising members across Computer Science, "
                    "Electronics, Mechanical, Biotechnology, and Design departments without departmental restriction."
                ),
            },
            {
                "number": "Clause 1.3",
                "heading": "Academic Standing and Active Backlogs",
                "text": (
                    "Students with active disciplinary warnings or having more than three (3) active course backlogs may participate "
                    "in weekend events but cannot receive official college sponsorship or travel reimbursement."
                ),
            },
        ],
    },
]


# ==============================================================================
# 2. Pure-Python Standard PDF 1.4 Writer (No external dependencies required)
# ==============================================================================

class SimplePdfWriter:
    """Generates authentic binary PDF 1.4 documents without third-party dependencies."""

    def __init__(self, title: str, doc_id: str, authority: str, effective_date: str):
        self.title = title
        self.doc_id = doc_id
        self.authority = authority
        self.effective_date = effective_date
        self.pages = []
        self.current_page_commands = []
        self.y = 750  # Start near top of standard 612x792 pt page (Letter/A4)
        self.page_width = 612
        self.page_height = 792
        self.margin_x = 54
        self.max_width = self.page_width - (self.margin_x * 2)

    def _wrap_text(self, text: str, max_chars: int = 80):
        words = text.split()
        lines = []
        cur = []
        cur_len = 0
        for w in words:
            if cur_len + len(w) + 1 <= max_chars:
                cur.append(w)
                cur_len += len(w) + 1
            else:
                if cur:
                    lines.append(" ".join(cur))
                cur = [w]
                cur_len = len(w)
        if cur:
            lines.append(" ".join(cur))
        return lines

    def _escape_pdf_text(self, s: str) -> str:
        return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    def add_header(self):
        # Decorative border / header bar
        self.current_page_commands.append(f"0.15 0.25 0.65 rg")  # Dark blue / pulse
        self.current_page_commands.append(f"{self.margin_x} {self.y} {self.max_width} 3 re f")
        self.y -= 25

        # Document ID & Title
        self.current_page_commands.append(f"0 0 0 rg")  # Black
        self.current_page_commands.append("BT /F1 16 Tf")
        self.current_page_commands.append(f"{self.margin_x} {self.y} Td ({self._escape_pdf_text(self.doc_id)}: {self._escape_pdf_text(self.title[:50])}) Tj ET")
        self.y -= 18

        if len(self.title) > 50:
            self.current_page_commands.append("BT /F1 14 Tf")
            self.current_page_commands.append(f"{self.margin_x} {self.y} Td ({self._escape_pdf_text(self.title[50:])}) Tj ET")
            self.y -= 18

        # Authority & Effective Date metadata
        self.current_page_commands.append("BT /F2 9 Tf 0.3 0.3 0.35 rg")
        self.current_page_commands.append(f"{self.margin_x} {self.y} Td (Authority: {self._escape_pdf_text(self.authority)}  |  Effective: {self._escape_pdf_text(self.effective_date)}) Tj ET")
        self.y -= 14

        self.current_page_commands.append(f"0.8 0.8 0.8 rg")
        self.current_page_commands.append(f"{self.margin_x} {self.y} {self.max_width} 1 re f")
        self.y -= 25

    def add_clause(self, number: str, heading: str, text: str):
        if self.y < 120:
            self.new_page()

        # Clause Heading
        self.current_page_commands.append("0 0 0 rg")
        self.current_page_commands.append("BT /F1 11 Tf")
        self.current_page_commands.append(f"{self.margin_x} {self.y} Td ({self._escape_pdf_text(number)} - {self._escape_pdf_text(heading)}) Tj ET")
        self.y -= 16

        # Clause Text with wrapping
        wrapped_lines = self._wrap_text(text, max_chars=82)
        self.current_page_commands.append("0.1 0.1 0.1 rg")
        self.current_page_commands.append("BT /F2 10 Tf")
        self.current_page_commands.append(f"{self.margin_x + 14} {self.y} Td")
        
        first = True
        for line in wrapped_lines:
            if not first:
                self.current_page_commands.append(f"0 -13 Td ({self._escape_pdf_text(line)}) Tj")
            else:
                self.current_page_commands.append(f"({self._escape_pdf_text(line)}) Tj")
                first = False
            self.y -= 13
        self.current_page_commands.append("ET")
        self.y -= 14

    def add_footer(self):
        # Footer stamp
        self.current_page_commands.append("0.7 0.7 0.7 rg")
        self.current_page_commands.append(f"{self.margin_x} 40 {self.max_width} 0.5 re f")
        self.current_page_commands.append("BT /F2 8 Tf 0.4 0.4 0.4 rg")
        footer_text = f"Official Campus Policy Corpus · Unity Catalog Volume: /Volumes/campusgenie/docs/policies/{self.doc_id}.pdf"
        self.current_page_commands.append(f"{self.margin_x} 28 Td ({self._escape_pdf_text(footer_text)}) Tj ET")

    def new_page(self):
        self.add_footer()
        self.pages.append("\n".join(self.current_page_commands))
        self.current_page_commands = []
        self.y = 750
        self.add_header()

    def build_pdf_bytes(self) -> bytes:
        self.add_footer()
        if self.current_page_commands:
            self.pages.append("\n".join(self.current_page_commands))

        objects = []
        
        # 1. Catalog
        # 2. Outlines
        # 3. Pages object
        # 4. Font 1 (Helvetica-Bold)
        # 5. Font 2 (Helvetica)
        # 6.. Page objects
        # .. Content streams

        num_pages = len(self.pages)
        page_obj_ids = [6 + i * 2 for i in range(num_pages)]
        content_obj_ids = [7 + i * 2 for i in range(num_pages)]

        # Obj 1: Catalog
        objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n")
        # Obj 2: Outlines
        objects.append(b"2 0 obj\n<< /Type /Outlines /Count 0 >>\nendobj\n")
        # Obj 3: Pages
        kids_refs = " ".join([f"{pid} 0 R" for pid in page_obj_ids])
        objects.append(f"3 0 obj\n<< /Type /Pages /Kids [{kids_refs}] /Count {num_pages} >>\nendobj\n".encode("latin1"))
        # Obj 4: Font Helvetica-Bold
        objects.append(b"4 0 obj\n<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica-Bold >>\nendobj\n")
        # Obj 5: Font Helvetica
        objects.append(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /Name /F2 /BaseFont /Helvetica >>\nendobj\n")

        for idx, (page_content, page_id, content_id) in enumerate(zip(self.pages, page_obj_ids, content_obj_ids)):
            # Page object
            page_dict = (
                f"{page_id} 0 obj\n"
                f"<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] "
                f"/Contents {content_id} 0 R "
                f"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>\n"
                f"endobj\n"
            ).encode("latin1")
            objects.append(page_dict)

            # Content stream object
            stream_bytes = page_content.encode("latin1")
            stream_obj = (
                f"{content_id} 0 obj\n"
                f"<< /Length {len(stream_bytes)} >>\n"
                f"stream\n"
            ).encode("latin1") + stream_bytes + b"\nendstream\nendobj\n"
            objects.append(stream_obj)

        # Assemble PDF with XREF table
        pdf_out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = [0]
        
        for obj in objects:
            offsets.append(len(pdf_out))
            pdf_out.extend(obj)

        xref_offset = len(pdf_out)
        pdf_out.extend(f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode("latin1"))
        for offset in offsets[1:]:
            pdf_out.extend(f"{offset:010d} 00000 n \n".encode("latin1"))

        pdf_out.extend(
            (
                f"trailer\n"
                f"<< /Size {len(offsets)} /Root 1 0 R /Info << /Title ({self.title}) /Creator (CampusGenie) >> >>\n"
                f"startxref\n{xref_offset}\n%%EOF\n"
            ).encode("latin1")
        )

        return bytes(pdf_out)


# ==============================================================================
# 3. Generator & Volume Staging Engine
# ==============================================================================

def generate_policy_pdf(policy: dict, output_dir: str) -> str:
    """Generates a valid binary PDF for a policy document."""
    os.makedirs(output_dir, exist_ok=True)
    writer = SimplePdfWriter(
        title=policy["title"],
        doc_id=policy["doc_id"],
        authority=policy["authority"],
        effective_date=policy["effective_date"]
    )
    writer.add_header()
    for clause in policy["clauses"]:
        writer.add_clause(clause["number"], clause["heading"], clause["text"])

    pdf_bytes = writer.build_pdf_bytes()
    filename = f"{policy['doc_id']}.pdf"
    filepath = os.path.join(output_dir, filename)
    with open(filepath, "wb") as f:
        f.write(pdf_bytes)
    return filepath


def generate_all_policy_pdfs(output_dir: str) -> list[str]:
    """Generates all institutional policy PDF documents into output_dir."""
    generated = []
    print(f"[PolicyPDFs] Generating {len(POLICIES)} policy documents into: {output_dir}")
    for pol in POLICIES:
        fp = generate_policy_pdf(pol, output_dir)
        size_kb = os.path.getsize(fp) / 1024.0
        print(f"  -> Generated {pol['doc_id']}: {fp} ({size_kb:.1f} KB)")
        generated.append(fp)
    return generated


def stage_to_uc_volume(source_dir: str, volume_path: str = "/Volumes/campusgenie/docs/policies"):
    """
    Stages generated policy PDFs to Databricks Unity Catalog Volume.
    Uses databricks CLI / DBFS volume API if available in workspace.
    """
    print(f"\n[PolicyPDFs] Staging policy documents to UC Volume: {volume_path}")
    pdf_files = [f for f in os.listdir(source_dir) if f.endswith(".pdf")]
    
    if not pdf_files:
        print("[PolicyPDFs] No PDF files found to upload.")
        return

    # Check for Databricks CLI
    try:
        res = subprocess.run(["databricks", "--version"], capture_output=True, text=True)
        if res.returncode == 0:
            print(f"[PolicyPDFs] Databricks CLI found ({res.stdout.strip()}). Uploading files...")
            for f in pdf_files:
                src = os.path.join(source_dir, f)
                dst = f"dbfs:{volume_path.rstrip('/')}/{f}"
                up_res = subprocess.run(["databricks", "fs", "cp", "--overwrite", src, dst], capture_output=True, text=True)
                if up_res.returncode == 0:
                    print(f"  -> Successfully uploaded {f} to {dst}")
                else:
                    print(f"  -> Notice: CLI upload note for {f}: {up_res.stderr.strip() or up_res.stdout.strip()}")
            return
    except Exception as e:
        print(f"[PolicyPDFs] Databricks CLI not active or local environment ({e}).")

    print(f"[PolicyPDFs] Local volume staging ready at {source_dir}. Target UC Volume mapping: {volume_path}")


def main():
    parser = argparse.ArgumentParser(description="Generate and stage CampusGenie policy PDFs")
    parser.add_argument(
        "--output-dir",
        default=os.path.join(os.path.dirname(__file__), "policies_volume"),
        help="Local directory to output generated PDF files",
    )
    parser.add_argument(
        "--stage-uc",
        action="store_true",
        help="Attempt staging to Databricks Unity Catalog Volume via CLI",
    )
    parser.add_argument(
        "--volume-path",
        default="/Volumes/campusgenie/docs/policies",
        help="Target UC Volume path in Databricks",
    )

    args = parser.parse_args()
    output_dir = os.path.abspath(args.output_dir)
    generated = generate_all_policy_pdfs(output_dir)
    print(f"\n[PolicyPDFs] Successfully created {len(generated)} authentic policy PDFs.")

    if args.stage_uc:
        stage_to_uc_volume(output_dir, args.volume_path)


if __name__ == "__main__":
    main()
