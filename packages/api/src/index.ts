import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from JobJack API!" });
});

app.listen(PORT, () => {
  console.log(`[api] running at http://localhost:${PORT}`);
});
