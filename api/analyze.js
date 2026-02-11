// api/analyze.js
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { days, weight, height, head, gender, name, lang } = await req.json();
    const isEnglish = lang === 'en';

    // 🌟 核心修改：中英文指令完全对齐
    const systemInstruction = isEnglish 
      ? `You are an empathetic, professional AI Pediatrician named "BabyUp Expert". 
         Target Audience: Anxious parents.
         Tone: Warm, encouraging, yet scientifically accurate (based on WHO standards).
         
         FORMATTING RULES:
         1. Use standard Markdown.
         2. Use **Bold** for key data and conclusions (e.g., **P50**, **Normal**).
         3. Use bullet points for lists.
         4. Do NOT use plain text blocks; separate ideas with line breaks.` 
      : `你是一位专业且温暖的 AI 儿科医生，名字叫“BabyUp 专家”。
         目标听众：关切宝宝成长的家长。
         基调：温暖、令人放心，同时基于 WHO 标准保持科学严谨。
         
         排版规则：
         1. 必须使用标准 Markdown 语法。
         2. 关键数据和结论必须使用 **加粗**（例如：**P50**，**完全达标**）。
         3. 使用列表项（Bullet points）展示细节。
         4. 段落之间要留空行，保持排版呼吸感。`;

    const userPrompt = isEnglish
      ? `Baby Profile: Name: ${name}, Gender: ${gender}, Age: ${days} days old.
         Measurements: Weight: ${weight}kg, Height: ${height}cm, Head Circumference: ${head ? head + 'cm' : 'N/A'}.

         Please generate a structured report exactly in this order:
         
         ### 1. Growth Assessment 📊
         * Analyze Weight, Height, and Head Circumference separately based on WHO percentiles.
         * Explicitly state if the baby is in the **Average**, **High**, or **Low** range.
         * Give a summary sentence: "Overall, ${name} is growing..."

         ### 2. What to Expect Next 🚀
         * Predict growth trends for the next month.
         * Mention 1-2 developmental milestones to look out for.

         ### 3. Expert Advice for this Month 💡
         * Provide 2-3 specific tips on nutrition, sleep, or play tailored to a ${days}-day-old baby.`

      : `宝宝档案：名字：${name}，性别：${gender}，月龄：${days}天。
         数据：体重：${weight}kg，身高：${height}cm，头围：${head ? head + 'cm' : '无'}。

         请严格按照以下结构生成报告：

         ### 1. 生长现状评估 📊
         * 基于 WHO 百分位，分别点评体重、身高、头围。
         * 明确指出宝宝处于 **中等**、**偏高** 还是 **偏低** 区间。
         * 给出一句总结：“总体来看，${name} 的生长...”

         ### 2. 未来趋势预测 🚀
         * 预测下一个月的生长速度。
         * 提醒家长关注 1-2 个即将到来的发育里程碑。

         ### 3. 本月龄专属建议 💡
         * 针对 ${days} 天大的宝宝，提供 2-3 条关于喂养、睡眠或大运动的具体建议。`;

    // 调用 AI (请确保这里填的是您真实的 API Key)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        'HTTP-Referer': 'https://babyup.app',
        'X-Title': 'BabyUp',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001', // 推荐使用 Gemini 或 GPT-4o-mini
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'AI API Error');
    }

    const aiText = data.choices?.[0]?.message?.content || (isEnglish ? "Generating report..." : "正在生成报告...");
    
    return new Response(JSON.stringify({ result: aiText }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate report' }), { status: 500 });
  }
}