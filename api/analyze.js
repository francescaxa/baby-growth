export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  try {
    // 1. 保留您原本的鉴权方式 (从环境变量读取)
    const apiKey = process.env.AI_API_KEY; 
    if (!apiKey) throw new Error("Missing API Key");

    // 2. 接收数据 (注意：这里接收了 lang)
    const { days, weight, height, head, gender, name, lang } = await request.json();
    
    // 判断语言
    const isEn = lang === 'en';
    const genderText = isEn ? (gender === 'male' ? 'boy' : 'girl') : (gender === 'male' ? '男宝宝' : '女宝宝');
    const ageText = isEn 
      ? `${Math.floor(days/30)} months ${days%30} days` 
      : `${Math.floor(days/30)}个月 ${days%30}天`;

    // 3. 动态构建提示词 (融合了您的医生人设 + 我的双语逻辑)
    // 为了适配前端的 Markdown 渲染器，我把原来的 HTML 标签换成了 Markdown 语法 (###, **)
    let systemPrompt;

    if (isEn) {
      // === 英文模式 (DeepSeek 英文版) ===
      systemPrompt = `You are "Dr. AI", a senior pediatrician with 20 years of experience.
      Evaluating Baby: ${name} (${genderText}, Age: ${ageText}).
      Current Data: Weight ${weight}kg, Height ${height}cm${head ? `, Head ${head}cm` : ''}.

      Please generate a report strictly in the following Markdown format:

      ### 🩺 Health Report for ${name}

      **Dear parent of ${name}, hello! I am your AI Pediatrician. It is my pleasure to evaluate your baby's growth. Let's see how ${name} is doing!**

      ### 1. Growth Assessment 📊
      (Analyze percentiles based on WHO standards. Be warm, encouraging, and clear to ease parental anxiety.)

      ### 2. Future Trends 🚀
      (Briefly describe what to expect in growth for the next month.)

      ### 3. Expert Advice for this Month 💡
      (Specific advice on feeding, sleep, or motor development for this age. Use bullet points.)

      Requirements:
      1. Tone: Warm, professional, conversational (like a face-to-face doctor visit).
      2. Format: Use standard Markdown. Use **Bold** for key conclusions.
      3. Language: STRICTLY ENGLISH.`;
    } else {
      // === 中文模式 (保留您原本的温暖人设) ===
      systemPrompt = `你是一位拥有20年经验的资深儿科专家(Dr. AI)。
      正在评估宝宝：${name} (${genderText}, 月龄 ${ageText})。
      当前数据：体重${weight}kg, 身高${height}cm${head ? `, 头围${head}cm` : ''}。
      
      请严格按照以下 Markdown 格式输出：

      ### 🩺 ${name}宝宝的体检报告

      **亲爱的${name}宝宝家长，您好！我是您的AI儿科医生，很高兴为您评估宝宝的健康成长情况。让我们一起来看看${name}宝宝的表现吧！**

      ### 1. 生长现状评估 📊
      (请根据WHO标准详细分析百分位，语气要通过肯定和鼓励来缓解家长焦虑)

      ### 2. 未来趋势预测 🚀
      (简述接下来的生长重点)

      ### 3. 本月龄专属建议 💡
      (针对该月龄给出喂养、睡眠或大运动发展的具体建议，分点列出)

      要求：
      1. 语气温暖、专业、像面对面交谈。
      2. 格式：使用标准 Markdown。重点结论用 **加粗** 显示。
      3. 语言：必须使用中文。`;
    }

    // 4. 发送请求给 SiliconFlow (DeepSeek) - 保持不变
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3", // 您的模型
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate report / 生成报告" }
        ],
        temperature: 0.7,
        max_tokens: 1024 // 建议加上防止输出中断
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      console.error("SiliconFlow API Error:", errData);
      throw new Error(`AI API Error: ${response.status}`);
    }

    const data = await response.json();

    // 5. 返回结果
    return new Response(JSON.stringify({ result: data.choices[0].message.content }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("AI Error:", error);
    return new Response(JSON.stringify({ result: "Dr. AI is busy, please try again later. / 专家正在忙碌，请稍后再试。" }), { status: 500 });
  }
}