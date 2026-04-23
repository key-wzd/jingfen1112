import axios from 'axios';

// 测试添加手机数据
async function testAddPhone() {
  try {
    const phoneData = {
      brand: 'Test Brand',
      model: 'Test Model',
      screen: '6.5英寸 OLED',
      processor: 'Snapdragon 8 Gen 3',
      ram: '8GB',
      storage: '256GB',
      camera: '5000万像素主摄',
      battery: '5000mAh',
      price: '¥3999',
      battery_capacity: '5000',
      video_power: 2500,
      game_power: 4500,
      standby_power: 50,
      browser_power: 1800
    };

    console.log('正在添加手机数据...');
    const response = await axios.post('http://localhost:3001/api/phones', phoneData);
    console.log('添加结果:', response.data);

    console.log('\n正在获取手机列表...');
    const phonesResponse = await axios.get('http://localhost:3001/api/phones');
    console.log('手机列表:', phonesResponse.data.data);

  } catch (error) {
    console.error('测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testAddPhone();
