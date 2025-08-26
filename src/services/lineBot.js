const line = require('@line/bot-sdk');
const { supabase } = require('../config/database');

// LINE Bot設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

// Webhook処理
const webhookHandler = async (req, res) => {
  try {
    const signature = req.headers['x-line-signature'];
    const body = req.body;

    // 署名検証
    if (!line.verify(body, process.env.LINE_CHANNEL_SECRET)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // イベント処理
    const events = body.events;
    for (const event of events) {
      await handleEvent(event);
    }

    res.status(200).json({ status: 'OK' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// イベント処理
const handleEvent = async (event) => {
  try {
    switch (event.type) {
      case 'message':
        await handleMessage(event);
        break;
      case 'postback':
        await handlePostback(event);
        break;
      case 'follow':
        await handleFollow(event);
        break;
      case 'unfollow':
        await handleUnfollow(event);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Event handling error:', error);
  }
};

// メッセージ処理
const handleMessage = async (event) => {
  const { message, replyToken, source } = event;
  
  if (message.type === 'text') {
    const text = message.text;
    
    // ユーザーの状態を取得
    const userState = await getUserState(source.userId);
    
    if (userState.step === 'onboarding') {
      await handleOnboardingStep(source.userId, text, replyToken);
    } else if (userState.step === 'appraisal') {
      await handleAppraisalStep(source.userId, text, replyToken);
    } else {
      await sendDefaultMessage(replyToken);
    }
  }
};

// 友だち追加処理
const handleFollow = async (event) => {
  const { source, replyToken } = event;
  
  try {
    // ユーザー情報を取得
    const profile = await client.getProfile(source.userId);
    
    // データベースにユーザーを登録
    const { error } = await supabase
      .from('owners')
      .insert({
        line_user_id: source.userId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl,
        status: 'pending',
        step: 'onboarding'
      });

    if (error) throw error;

    // オンボーディング開始メッセージ
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '二宮不動産の査定サービスへようこそ！\n\nまずは簡単な情報をお聞かせください。\n\nお名前を教えてください。'
    });

  } catch (error) {
    console.error('Follow handling error:', error);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: '申し訳ございません。エラーが発生しました。\nしばらく時間をおいて再度お試しください。'
    });
  }
};

// 友だち削除処理
const handleUnfollow = async (event) => {
  try {
    // ユーザーのステータスを更新
    await supabase
      .from('owners')
      .update({ status: 'unfollowed' })
      .eq('line_user_id', event.source.userId);
  } catch (error) {
    console.error('Unfollow handling error:', error);
  }
};

// ポストバック処理
const handlePostback = async (event) => {
  const { postback, replyToken } = event;
  const data = postback.data;
  
  try {
    if (data.startsWith('appraisal_')) {
      await handleAppraisalPostback(event);
    } else if (data.startsWith('consult_')) {
      await handleConsultPostback(event);
    } else if (data.startsWith('book_')) {
      await handleBookingPostback(event);
    }
  } catch (error) {
    console.error('Postback handling error:', error);
  }
};

// オンボーディングステップ処理
const handleOnboardingStep = async (userId, text, replyToken) => {
  try {
    const { data: user } = await supabase
      .from('owners')
      .select('*')
      .eq('line_user_id', userId)
      .single();

    if (!user) throw new Error('User not found');

    let nextStep = user.step;
    let updateData = {};

    switch (user.step) {
      case 'onboarding':
        updateData = { name: text, step: 'phone' };
        await client.replyMessage(replyToken, {
          type: 'text',
          text: `ありがとうございます、${text}さん。\n\n次に、お電話番号を教えてください。\n（例：090-1234-5678）`
        });
        break;
      
      case 'phone':
        updateData = { phone: text, step: 'consent' };
        await client.replyMessage(replyToken, {
          type: 'template',
          altText: '学習可否の確認',
          template: {
            type: 'buttons',
            title: '学習可否の確認',
            text: '査定結果を学習データとして使用してもよろしいですか？\n（より精度の高い査定のため）',
            actions: [
              {
                type: 'postback',
                label: 'はい',
                data: 'consent_yes'
              },
              {
                type: 'postback',
                label: 'いいえ',
                data: 'consent_no'
              }
            ]
          }
        });
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('owners')
        .update(updateData)
        .eq('line_user_id', userId);
    }

  } catch (error) {
    console.error('Onboarding step error:', error);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'エラーが発生しました。もう一度お試しください。'
    });
  }
};

// 査定ステップ処理
const handleAppraisalStep = async (userId, text, replyToken) => {
  try {
    const { data: user } = await supabase
      .from('owners')
      .select('*')
      .eq('line_user_id', userId)
      .single();

    if (!user) throw new Error('User not found');

    let nextStep = user.step;
    let updateData = {};

    switch (user.step) {
      case 'address':
        updateData = { address: text, step: 'area' };
        await client.replyMessage(replyToken, {
          type: 'text',
          text: 'ありがとうございます。\n\n次に、建物の面積を教えてください。\n（例：100㎡）'
        });
        break;
      
      case 'area':
        updateData = { area: text, step: 'age' };
        await client.replyMessage(replyToken, {
          type: 'text',
          text: 'ありがとうございます。\n\n次に、築年数を教えてください。\n（例：10年）'
        });
        break;
      
      case 'age':
        updateData = { age: text, step: 'purpose' };
        await client.replyMessage(replyToken, {
          type: 'text',
          text: 'ありがとうございます。\n\n最後に、用途を教えてください。\n（例：住宅、店舗、事務所など）'
        });
        break;
      
      case 'purpose':
        updateData = { purpose: text, step: 'processing' };
        await client.replyMessage(replyToken, {
          type: 'text',
          text: 'ありがとうございます。\n\n査定を開始いたします。\nしばらくお待ちください...'
        });
        
        // 査定処理を開始
        await startAppraisal(userId);
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('owners')
        .update(updateData)
        .eq('line_user_id', userId);
    }

  } catch (error) {
    console.error('Appraisal step error:', error);
    await client.replyMessage(replyToken, {
      type: 'text',
      text: 'エラーが発生しました。もう一度お試しください。'
    });
  }
};

// 査定開始
const startAppraisal = async (userId) => {
  try {
    // 査定処理の実装
    // Reinfolib API + 近傍補正 + AI予測
    
    // 仮の査定結果
    const appraisalResult = {
      price_range: '3,000万円〜3,500万円',
      confidence: 0.85,
      nearby_count: 15,
      radius: '500m',
      period: '6ヶ月',
      features: ['駅徒歩5分', '南向き', '角地']
    };

    // 結果を保存
    await supabase
      .from('appraisals')
      .insert({
        owner_id: userId,
        result: appraisalResult,
        status: 'completed'
      });

    // 結果をユーザーに送信
    await sendAppraisalResult(userId, appraisalResult);

  } catch (error) {
    console.error('Appraisal error:', error);
  }
};

// 査定結果送信
const sendAppraisalResult = async (userId, result) => {
  try {
    const message = {
      type: 'template',
      altText: '査定結果',
      template: {
        type: 'buttons',
        title: '査定結果',
        text: `査定が完了いたしました！\n\n価格レンジ：${result.price_range}\n\n根拠：\n・近傍件数：${result.nearby_count}件\n・期間：${result.period}\n・半径：${result.radius}\n・特徴：${result.features.join('、')}`,
        actions: [
          {
            type: 'postback',
            label: '相談する',
            data: 'consult_start'
          }
        ]
      }
    };

    await client.pushMessage(userId, message);
  } catch (error) {
    console.error('Send appraisal result error:', error);
  }
};

// ユーザー状態取得
const getUserState = async (userId) => {
  try {
    const { data } = await supabase
      .from('owners')
      .select('step')
      .eq('line_user_id', userId)
      .single();
    
    return data || { step: 'unknown' };
  } catch (error) {
    console.error('Get user state error:', error);
    return { step: 'unknown' };
  }
};

// デフォルトメッセージ
const sendDefaultMessage = async (replyToken) => {
  await client.replyMessage(replyToken, {
    type: 'text',
    text: '査定サービスについて何かご質問がございましたら、お気軽にお声かけください。'
  });
};

module.exports = {
  client,
  webhookHandler,
  sendAppraisalResult
};
