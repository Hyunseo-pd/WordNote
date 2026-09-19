import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 가능합니다." });
  }

  const { word } = req.body;

  if (!word) {
    return res.status(400).json({ error: "단어가 없습니다." });
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-5.6",
      input: `${word}를 사용해서 ${req.body.difficulty || "쉬운"}난이도의 ${req.body.length || "중간"}길이의  ${req.body.style || "구어체"} 스타일의 ${req.body.language || "영어"} 예문 하나를 만들고 한국어 뜻도 알려줘.`,
    });

    return res.status(200).json({
      example: response.output_text,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "예문 생성 실패",
    });
  }
}
