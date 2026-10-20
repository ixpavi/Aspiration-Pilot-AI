# Career Navigator - Smart Job Recommender

Career Navigator is a web application designed to help users find suitable job roles by leveraging their professional portfolio and resume. It provides a personalized dashboard, AI-powered career guidance, and tools to track job applications and skill development.

## 🚀 Project Status

This project is currently in the initial development phase. The frontend is built with React, Vite, and `shadcn/ui`, and it includes a landing page, authentication, and a user dashboard. The backend is powered by Supabase, with a database schema designed to support user profiles, job applications, certifications, and more.

Resume analysis, job matching and skill recommendations run client-side (see below).

## 🛠️ Tech Stack

- **Frontend:**
  - [React](https://reactjs.org/)
  - [Vite](https://vitejs.dev/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [shadcn/ui](https://ui.shadcn.com/)
- **Backend:**
  - [Supabase](https://supabase.io/) (PostgreSQL, Authentication, Storage)
- **Deployment:** (Not yet configured)

## ⚙️ Getting Started

```sh
npm install
npm run dev
```

Open http://localhost:8080. Use **Continue as Guest** for demo data, or sign up to upload a resume.
`.env` points at the Supabase project the app was built against; replace the values to use your own
(run `setup-database.sql` in its SQL editor first).

## 🤖 How the resume ML works

Everything runs in the browser (`src/lib/ml-engine.ts`, `src/lib/ml-services.ts`):

1. **Text extraction**: PDF via pdf.js (worker bundled locally), DOCX via mammoth, or plain text.
2. **Skill extraction**: a taxonomy of ~120 skills with aliases (e.g. `reactjs` → react, `k8s` → kubernetes),
   matched on word boundaries so "Java" isn't found inside "JavaScript" and "go" isn't found in "good".
3. **Experience & education**: date ranges (`Jan 2022 – Present`, `2019-2021`, `07/2020 - 12/2021`) become
   roles with durations; overlapping roles are merged for total years.
4. **Job ranking**: a TF-IDF model scores resume-to-job text similarity, combined with required-skill coverage,
   experience fit and title overlap. Jobs come from the `jobs` table, or a built-in catalog of 24 roles
   (`src/lib/job-catalog.ts`) when the table is empty.

Sample resumes for testing are in `sample-resumes/`.

## 🗃️ Database Schema

The database schema is defined in the Supabase migration file. It includes the following tables:

- `profiles`: Stores user profile information.
- `certifications`: Stores user certifications.
- `job_applications`: Tracks user job applications.
- `career_chats`: Stores the history of AI-powered career chats.
- `user_settings`: Manages user-specific settings like themes and notifications.

Row Level Security (RLS) is enabled on all tables to ensure that users can only access their own data.

## 🗺️ Future Roadmap

- ✅ **Real Authentication:** Implemented Supabase authentication for secure user login and registration.
- **Connect Dashboard to Backend:** Fetch and display user data from Supabase on the dashboard.
- **Resume Upload and Parsing:** Allow users to upload their resumes and parse them to extract key information.
- **AI/ML Integration:**
  - Integrate a pre-trained NLP model (e.g., BERT) for semantic analysis of resumes and job descriptions.
  - Develop a recommendation engine to match users with suitable job roles.
- **Job Board Integration:** Fetch job listings from external APIs (e.g., LinkedIn, Indeed).
- **User Feedback Loop:** Implement a system for users to provide feedback on job recommendations, which can be used to fine-tune the recommendation model.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
