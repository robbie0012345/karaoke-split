import { useState, useRef, useEffect } from 'react';
import {
  Layout,
  Typography,
  Input,
  InputNumber,
  Button,
  TimePicker,
  Popover
} from 'antd';
import dayjs from 'dayjs';
import { v4 as uuid } from 'uuid';
import './App.css';
import { SPECIAL_MEMBERS } from './config/specialMembers';

const { Content } = Layout;
const { Title } = Typography;

function calcAmounts(members, total) {
  const totalHours = members.reduce((s, m) => s + (m.hours || 0), 0);
  return members.map(m => ({
    ...m,
    amount:
      totalHours > 0
        ? +(total * m.hours / totalHours).toFixed(2)
        : 0
  }));
}

function calcHoursFromRange(range) {
  if (!range) return 0;

  let [start, end] = range;

  if (end.isBefore(start)) {
    end = end.add(1, 'day');
  }

  const minutes = end.diff(start, 'minute');
  return minutes > 0 ? +(minutes / 60).toFixed(2) : 0;
}

function formatRange(range) {
  if (!range) return '';
  return `${range[0].format('HH:mm')}–${range[1].format('HH:mm')}`;
}

function getMemberStyle(name) {
  if (!name) return null;

  const key = name.trim().toLowerCase();
  const config = SPECIAL_MEMBERS[key];

  if (!config) return null;

  const fullPath = `${import.meta.env.BASE_URL}${config.backgroundImage.replace(/^\//, '')}`;
  return {
    backgroundImage: `
      linear-gradient(90deg, rgba(247, 249, 252, 0) 10%, #f7f9fc 60%),
      url("${fullPath}")
    `,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left 12px center',
    backgroundSize: 'auto 80%',
    transition: 'background 0.3s ease',
  };
}

export default function App() {
  const [total, setTotal] = useState();
  const [members, setMembers] = useState(
    Array.from({ length: 5 }).map((_, i) => ({
      id: uuid(),
      name: ``,
      hours: null,
      amount: 0
    }))
  );
  const memberControlRef = useRef(null);
  useEffect(() => {
    const preloadImages = () => {
      Object.values(SPECIAL_MEMBERS).forEach((member) => {
        if (member.backgroundImage) {
          const img = new Image();
          const fullPath = `${import.meta.env.BASE_URL}${member.backgroundImage.replace(/^\//, '')}`;
          img.src = fullPath;
        }
      });
    };

    preloadImages();
  }, []);
  useEffect(() => {
    memberControlRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }, [members.length]);

  useEffect(() => {
    updateMembers(members);
  }, [total]);

  const updateMembers = (next) => {
    setMembers(calcAmounts(next, total));
  };

  const setMemberCount = (count) => {
    if (count < 0) return;

    let next = [...members];

    if (count > next.length) {
      while (next.length < count) {
        next.push({
          id: uuid(),
          name: ``,
          hours: null,
          amount: 0
        });
      }
    } else {
      next = next.slice(0, count);
    }

    updateMembers(next);
  };

  const updateMember = (id, patch) => {
    updateMembers(
      members.map(m => m.id === id ? { ...m, ...patch } : m)
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Content
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '24px 16px',
        }}
      >
        {/* ===== 标题 ===== */}
        <div style={{ textAlign: 'center', marginBottom: 30, marginTop: 20 }}>
          <Title
            level={2}
            style={{
              margin: 0,
              fontWeight: 850,
              background: 'linear-gradient(135deg, #1677ff 0%, #00d2ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-1px',
              display: 'inline-block'
            }}
          >
            AA喵
          </Title>
          {/* 浮动的装饰小图标 */}
          <span style={{ 
            display: 'inline-block', 
            fontSize: 24, 
            marginLeft: 8, 
            animation: 'bounce 2s infinite ease-in-out' 
          }}>
            🐱
          </span>
        </div>

        {/* ===== 总金额 ===== */}
        <div style={{
          background: 'linear-gradient(145deg, #ffffff, #f0f5ff)',
          borderRadius: 24,
          padding: '20px 24px',
          boxShadow: '0 10px 40px rgba(22, 119, 255, 0.08)',
          maxWidth: 400,
          margin: '0 auto 40px auto',
          border: '1px solid rgba(22, 119, 255, 0.1)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* 背景装饰球 */}
          <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            background: 'rgba(22, 119, 255, 0.03)',
            borderRadius: '50%'
          }} />
        
          <div style={{ 
            fontSize: 14, 
            color: '#64748b', 
            fontWeight: 600, 
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            💰 总金额 💰
          </div>
        
          <div style={{ 
            display: 'flex', 
            alignItems: 'baseline', 
            justifyContent: 'center',
            gap: 8 
          }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#1677ff' }}>¥</span>
            <InputNumber
              value={total}
              onChange={(v) => {
                const newTotal = v || 0;
                setTotal(newTotal);
                updateMembers(members, newTotal); // 传入最新值修复异步bug
              }}
              placeholder="0.00"
              controls={false}
              bordered={false} // 去掉默认边框，使用下划线风格
              style={{
                width: '150px',
                fontSize: 25,
                fontWeight: 800,
                color: '#1f2937',
                borderBottom: '2px solid #e5e7eb',
                borderRadius: 0,
                transition: 'border-color 0.3s'
              }}
              // 获取焦点时下划线变色
              onFocus={(e) => e.target.closest('.ant-input-number').style.borderBottomColor = '#1677ff'}
              onBlur={(e) => e.target.closest('.ant-input-number').style.borderBottomColor = '#e5e7eb'}
            />
          </div>
        </div>

        {/* ===== 成员列表 ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {members.map((m, index) => {
            const config = getMemberStyle(m.name);
            const hasConfig = !!config;           
            const inputStyle = {
              flex: 1,
              height: 40,
              width: '100%',
              borderRadius: 12,
              backgroundColor: hasConfig ? 'rgba(255, 255, 255, 0.5)' : '#fff',
              // backdropFilter: hasConfig ? 'blur(2px)' : 'none',
              border: hasConfig ? '1px solid rgba(0,0,0,0.1)' : undefined,
              transition: 'all 0.3s',
            };
            return (
              <div
              key={m.id}
              style={{
                background: '#f7f9fc',
                borderRadius: 16,
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                ...(getMemberStyle(m.name) || {})
              }}
            >
              {/* 姓名 */}
              <Input
                value={m.name}
                onChange={e =>
                  updateMember(m.id, { name: e.target.value })
                }
                style={inputStyle}
                placeholder={`成员 ${index + 1}`}
              />

              {/* 小时数 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', flexShrink: 0 }}>
                <InputNumber
                  min={0}
                  value={m.hours}
                  controls={false}
                  placeholder="小时"
                  style={{
                    height: 40,
                    borderRadius: 12,
                    width: 'clamp(50px, 18vw, 90px)',
                    textAlign: 'center'
                  }}
                  onChange={(v) =>
                    updateMember(m.id, {
                      hours: v || 0,
                      timeRange: null
                    })
                  }
                />
              
                {m.timeRange && (
                  <span
                    style={{
                      position: 'absolute',
                      right: -15,
                      top: '120%',
                      transform: 'translateY(-50%)',
                      fontSize: 12,
                      color: '#9ca3af',
                      pointerEvents: 'none',
                    }}
                  >
                    {formatRange(m.timeRange)}
                  </span>
                )}
              
                {/* 时间选择按钮 */}
                <Popover
                  trigger="click"
                  placement="bottom"
                  content={
                    <TimePicker.RangePicker
                      format="HH:mm"
                      minuteStep={5}
                      value={m.timeRange}
                      placeholder={['开始时间', '结束时间']}
                      onChange={(range) => {
                        const hours = calcHoursFromRange(range);
                        updateMember(m.id, {
                          timeRange: range,
                          hours
                        });
                      }}
                    />
                  }
                >
                  <button
                   style={{
                     border: 'none',
                     background: '#1677ff',
                     color: '#fff',
                     borderRadius: 8,
                     padding: '6px 12px',
                     cursor: 'pointer',
                     fontSize: 14
                   }}
                  >
                   ⏱️
                  </button>
                </Popover>
                
              </div>

              {/* 金额展示 */}
              <div
                style={{
                  minWidth: 80,
                  height: 40,
                  borderRadius: 12,
                  background: '#eaf4ff',
                  color: '#1677ff',
                  fontWeight: 'bolder',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15
                }}
              >
                ¥ {total > 0 ? m.amount.toFixed(2) : '0.00'}
              </div>
              </div>
            )})}
        </div>

        {/* ===== 成员数量 Stepper ===== */}
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 999,
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              boxShadow: '0 8px 20px rgba(0,0,0,0.08)'
            }}
            ref={memberControlRef}
          >
            <Button
              type="primary"
              shape="round"
              onClick={() => setMemberCount(members.length - 1)}
              disabled={members.length <= 0}
            >
              −
            </Button>

            <InputNumber
              className='center-input'
              value={members.length}
              onChange={(v) => setMemberCount(v || 0)}
              controls={false}
              style={{
                width: 48,
                height: 32,
                fontSize: 16,
                borderRadius: 8,
                textAlign: 'center'
              }}
            />

            <Button
              type="primary"
              shape="round"
              onClick={() => setMemberCount(members.length + 1)}
            >
              +
            </Button>
          </div>
        </div>
      </Content>
    </Layout>
  );
}
