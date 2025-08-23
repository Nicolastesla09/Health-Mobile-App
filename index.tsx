
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";
import { UploadCloud, Bot, HeartPulse, BrainCircuit, TestTube2, User, Venus, Mars, RotateCcw, Send, ShieldCheck, CalendarDays, CheckCircle2, Activity, Scale, LogOut, History, Carrot, UtensilsCrossed, Info, Flame, Droplets, Bone, Filter, ArrowUpDown, FileDown, Briefcase, ChevronLeft, ChevronRight, Apple, Dumbbell, Sparkles, Moon, Sun, Plus, Home } from 'lucide-react';
import { Radar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const radarBackgroundPlugin = {
  id: 'radarBackgroundPlugin',
  beforeDatasetsDraw: (chart) => {
    const { ctx, scales: { r } } = chart;
    if (!r || r.options.display === false) {
      return;
    }

    const ticksLength = r.getLabels().length;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const zones = [
      { max: 4, color: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(220, 53, 69, 0.15)' }, // Bad
      { max: 7, color: isDark ? 'rgba(250, 189, 47, 0.1)' : 'rgba(255, 193, 7, 0.15)' },  // Moderate
      { max: 10, color: isDark ? 'rgba(184, 187, 38, 0.1)' : 'rgba(40, 167, 69, 0.15)' }  // Good
    ];

    const angleStep = (2 * Math.PI) / ticksLength;

    ctx.save();
    zones.forEach(zone => {
      ctx.beginPath();
      ctx.fillStyle = zone.color;
      const radius = r.getDistanceFromCenterForValue(zone.max);
      ctx.moveTo(r.xCenter, r.yCenter);
      for (let i = 0; i < ticksLength; i++) {
        const angle = r.startAngle + i * angleStep;
        ctx.lineTo(r.xCenter + radius * Math.cos(angle), r.yCenter + radius * Math.sin(angle));
      }
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }
};

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale, radarBackgroundPlugin);

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY is not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const CATEGORY_ICONS = {
    "Sức khỏe Tim mạch": HeartPulse,
    "Chức năng Gan": Flame,
    "Chức năng Thận": Droplets,
    "Chuyển hóa Mỡ": TestTube2,
    "Chuyển hóa Đường": Sparkles,
    "Sức khỏe Xương": Bone,
    "Tổng quát": ShieldCheck,
};

const CATEGORY_SCORES_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        health_score: { type: Type.NUMBER, description: "Điểm sức khỏe tổng thể từ 0 đến 100." },
        bmi: {
            type: Type.OBJECT,
            properties: {
                value: { type: Type.NUMBER },
                category: { type: Type.STRING },
                summary: { type: Type.STRING }
            }
        },
        category_scores: {
            type: Type.ARRAY,
            description: "Điểm số cho từng danh mục sức khỏe chính.",
            items: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    summary: { type: Type.STRING }
                }
            }
        },
        results: {
            type: Type.ARRAY,
            description: "Phân tích chi tiết cho từng chỉ số xét nghiệm.",
            items: {
                type: Type.OBJECT,
                properties: {
                    indicator: { type: Type.STRING, description: "Tên chỉ số xét nghiệm, ví dụ: 'Cholesterol toàn phần'." },
                    value: { type: Type.STRING, description: "Giá trị đo được, bao gồm cả đơn vị." },
                    status: { type: Type.STRING, description: "Trạng thái ('Bình thường', 'Cao', 'Thấp')." },
                    insight: { type: Type.STRING, description: "Nhận định ngắn gọn về ý nghĩa của kết quả." }
                }
            }
        },
        recommendations: {
            type: Type.OBJECT,
            properties: {
                supplements: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            benefit: { type: Type.STRING },
                            dosage: { type: Type.STRING }
                        }
                    }
                }
            }
        }
    }
};

const PLAN_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        plan: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING },
                    meals: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                meal: { type: Type.STRING },
                                dishes: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            notes: { type: Type.STRING }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    daily_tip: { type: Type.STRING },
                }
            }
        }
    }
};

const WORKOUT_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    workout_plan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING },
          focus: { type: Type.STRING },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                sets_reps: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  }
};


const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1] || '');
            } else {
                resolve('');
            }
        };
        reader.readAsDataURL(file);
    });
    return {
        inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
};

const AuthScreen = ({ onSignIn, onSignUp, isSigningUp, setIsSigningUp, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isSigningUp) {
            onSignUp(email, password);
        } else {
            onSignIn(email, password);
        }
    };
    
    return (
        _jsx("div", { className: "auth-container", children: _jsxs("div", { className: "auth-box", children: [_jsxs("h2", { children: [_jsx(BrainCircuit, {}), " Trợ lý Sức khỏe AI"] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "Email", required: true, "aria-label": "Email" }), _jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Mật khẩu", required: true, "aria-label": "Mật khẩu" }), error && _jsx("p", { className: "auth-error", children: error }), _jsx("button", { type: "submit", className: "auth-button", children: isSigningUp ? 'Đăng ký' : 'Đăng nhập' })] }), _jsxs("p", { className: "auth-toggle", onClick: () => setIsSigningUp(!isSigningUp), children: [isSigningUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?', " ", _jsx("span", { children: isSigningUp ? 'Đăng nhập' : 'Đăng ký ngay' })] })] }) })
    );
};

const Header = ({ title, icon: Icon }) => (
    _jsxs("div", { className: "header", children: [_jsxs("div", { className: "header-main", children: [Icon && _jsx(Icon, { className: "icon", "aria-hidden": "true" }), _jsx("h1", { children: title })] }), _jsx("p", { children: "Tải lên kết quả xét nghiệm để nhận phân tích toàn diện và theo dõi sức khỏe theo thời gian." })] })
);


const AnalysisForm = ({ onAnalyze, isLoading, files, setFiles }) => {
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [gender, setGender] = useState('male');
    const [occupation, setOccupation] = useState('');
    const fileInputRef = useRef(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };
    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(event.dataTransfer.files)]);
        }
    };
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAnalyze({ age, height, weight, gender, occupation });
    };

    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsx(Header, { title: "Trợ lý Phân tích Xét nghiệm AI", icon: BrainCircuit }), _jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "age", children: "Tuổi" }), _jsx("input", { id: "age", type: "number", value: age, onChange: (e) => setAge(e.target.value), placeholder: "VD: 30", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "height", children: "Chiều cao (cm)" }), _jsx("input", { id: "height", type: "number", value: height, onChange: (e) => setHeight(e.target.value), placeholder: "VD: 175", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "weight", children: "Cân nặng (kg)" }), _jsx("input", { id: "weight", type: "number", value: weight, onChange: (e) => setWeight(e.target.value), placeholder: "VD: 70", required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Giới tính" }), _jsxs("div", { className: "gender-options", children: [_jsx("div", { className: "gender-option", children: _jsxs("label", { children: [_jsx("input", { type: "radio", name: "gender", value: "male", checked: gender === 'male', onChange: (e) => setGender(e.target.value) }), _jsx(Mars, { className: "icon", "aria-hidden": "true" }), " Nam"] }) }), _jsx("div", { className: "gender-option", children: _jsxs("label", { children: [_jsx("input", { type: "radio", name: "gender", value: "female", checked: gender === 'female', onChange: (e) => setGender(e.target.value) }), _jsx(Venus, { className: "icon", "aria-hidden": "true" }), " Nữ"] }) })] })] }), _jsxs("div", { className: "form-group full-width", children: [_jsxs("label", { htmlFor: "occupation", children: [_jsx(Briefcase, { size: 18 }), " Công việc hiện tại"] }), _jsx("input", { id: "occupation", type: "text", value: occupation, onChange: (e) => setOccupation(e.target.value), placeholder: "VD: Nhân viên văn phòng", required: true })] }), _jsxs("div", { className: "file-upload-area", onClick: triggerFileInput, onDragOver: handleDragOver, onDrop: handleDrop, children: [_jsx(UploadCloud, { className: "icon", "aria-hidden": "true" }), _jsx("p", { children: "Nhấn để tải lên hoặc kéo thả tệp" }), _jsx("span", { children: "Hỗ trợ nhiều tệp Ảnh hoặc PDF" }), _jsx("input", { type: "file", ref: fileInputRef, onChange: handleFileChange, multiple: true, accept: "image/*,application/pdf", style: { display: 'none' } }), files.length > 0 && _jsx("div", { className: "file-list", children: files.map((file, index) => _jsx("p", { className: "file-name", children: file.name }, index)) })] }), _jsx("button", { type: "submit", className: "submit-button", disabled: isLoading || files.length === 0, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [isLoading ? _jsx("div", { className: "spinner", style: { width: '20px', height: '20px', borderTopColor: 'white' } }) : _jsx(Send, { "aria-hidden": "true" }), " ", isLoading ? 'Đang phân tích...' : 'Phân tích'] }) })] }), _jsx("div", { className: "disclaimer", children: "Tuyên bố miễn trừ trách nhiệm: Ứng dụng này sử dụng AI để cung cấp thông tin tham khảo và không thay thế cho tư vấn y tế chuyên nghiệp. Luôn tham khảo ý kiến bác sĩ để có chẩn đoán và điều trị chính xác." })] }));
};

const ResultsDisplay = ({ result, onReset, onSave, isSaved }) => {
    const [showAll, setShowAll] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const resultsContainerRef = useRef(null);

    const { health_score, bmi, category_scores, results, recommendations } = result.analysis;

    const getScoreLabel = (score) => {
        if (score >= 7) return "Tốt";
        if (score >= 4) return "Trung bình";
        return "Cần cải thiện";
    };

    const getBmiStyle = (category) => {
        switch (category) {
            case "Underweight": return "bmi-underweight";
            case "Normal": return "bmi-normal";
            case "Overweight": return "bmi-overweight";
            case "Obese": return "bmi-obese";
            default: return "";
        }
    };
    
    const radarData = {
        labels: category_scores.map(c => c.category),
        datasets: [{
            label: 'Điểm Sức khỏe',
            data: category_scores.map(c => c.score),
            backgroundColor: 'rgba(90, 138, 58, 0.2)',
            borderColor: 'rgba(90, 138, 58, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(90, 138, 58, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(90, 138, 58, 1)'
        }]
    };
    const radarOptions = {
        scales: {
            r: {
                min: 0,
                max: 10,
                ticks: { display: false, stepSize: 2 },
                grid: { color: 'rgba(128, 128, 128, 0.2)' },
                angleLines: { color: 'rgba(128, 128, 128, 0.2)' },
                pointLabels: {
                    font: { size: 12, weight: 'bold' },
                    color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ebdbb2' : '#333333'
                }
            }
        },
        plugins: {
            legend: { display: false },
        },
        maintainAspectRatio: false,
    };

    const getStatusClass = (status) => {
        if (!status) return '';
        const s = status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        return `status-${s}`;
    };

    const handleExportPDF = useCallback(async () => {
        setIsExporting(true);
        const element = resultsContainerRef.current;
        if (element) {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / imgHeight;
            let finalImgWidth = pdfWidth;
            let finalImgHeight = pdfWidth / ratio;
            let position = 0;
            let heightLeft = finalImgHeight;

            pdf.addImage(imgData, 'PNG', 0, position, finalImgWidth, finalImgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - finalImgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, finalImgWidth, finalImgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`ket-qua-phan-tich-${new Date().toISOString().slice(0, 10)}.pdf`);
        }
        setIsExporting(false);
    }, []);

    const filteredResults = showAll ? results : results.filter(r => r.status !== 'Bình thường');

    return (
        _jsxs("div", { className: "results-container", ref: resultsContainerRef, children: [_jsxs("div", { className: "results-header-grid", children: [_jsxs("div", { className: "health-score-card", children: [_jsx("h3", { children: "Điểm sức khỏe tổng thể" }), _jsxs("div", { className: "health-score-value-wrapper", children: [_jsx("p", { className: "health-score-value", children: Math.round(health_score) }), _jsx("span", { children: "/ 100" })] }), _jsx("div", { className: "health-score-label", children: getScoreLabel(health_score / 10) }), _jsx("br", {}), _jsxs("div", { className: "health-score-tooltip", children: [_jsx(Info, { size: 16 }), _jsxs("div", { className: "tooltip-content", children: [_jsx("h4", { children: "Điểm sức khỏe là gì?" }), _jsx("p", { children: "Đây là chỉ số tổng hợp dựa trên tất cả các kết quả xét nghiệm của bạn, đánh giá tình trạng sức khỏe chung trên thang điểm 100." })] })] })] }), _jsxs("div", { className: "body-analysis-card", children: [_jsx("h3", { children: "Phân tích cơ thể" }), _jsxs("div", { className: "body-analysis-grid", children: [_jsxs("div", { className: "bmi-item", children: [_jsx(Scale, { size: 20 }), _jsx("strong", { children: "BMI:" }), _jsxs("span", { className: `bmi-value ${getBmiStyle(bmi.category)}`, children: [bmi.value, _jsx("span", { children: "kg/m²" })] })] }), _jsx("p", { className: "bmi-summary", children: bmi.summary })] })] })] }), _jsxs("div", { className: "health-overview-section", children: [_jsxs("h2", { children: [_jsx(HeartPulse, { "aria-hidden": "true" }), " Tổng quan sức khỏe"] }), _jsxs("div", { className: "overview-content", children: [_jsx("div", { className: "chart-container", children: _jsx(Radar, { data: radarData, options: radarOptions }) }), _jsx("div", { className: "category-summary-grid", children: category_scores.map(({ category, score, summary }) => {
                            const status = getScoreLabel(score);
                            const statusClass = status === 'Tốt' ? 'good' : status === 'Trung bình' ? 'moderate' : 'bad';
                            const Icon = CATEGORY_ICONS[category] || ShieldCheck;
                            return (_jsxs("div", { className: `category-card status-bg-${statusClass}`, children: [_jsxs("div", { className: "category-card-header", children: [_jsx(Icon, { className: "category-icon", "aria-hidden": "true" }), _jsx("h4", { children: category }), _jsx("div", { className: `score-circle status-border-${statusClass}`, children: score })] }), _jsx("p", { className: "summary", children: summary })] }, category));
                        }) })] })] }), _jsxs("div", { className: "detailed-results-section", children: [_jsxs("h2", { children: [_jsx(TestTube2, { "aria-hidden": "true" }), " Kết quả chi tiết"] }), _jsxs("div", { className: "table-controls", children: [_jsxs("div", { className: "control-group", children: [_jsxs("label", { htmlFor: "showAll", children: [_jsx(Filter, { size: 16 }), " Hiển thị tất cả chỉ số"] }), _jsx("label", { className: "switch", children: [_jsx("input", { id: "showAll", type: "checkbox", checked: showAll, onChange: () => setShowAll(!showAll) }), _jsx("span", { className: "slider round" })] })] }), _jsx("button", { className: "action-button", onClick: () => {
                                const table = document.querySelector('.results-table');
                                const sortedResults = [...results].sort((a, b) => a.indicator.localeCompare(b.indicator));
                                if (JSON.stringify(filteredResults) === JSON.stringify(sortedResults)) {
                                    sortedResults.reverse();
                                }
                                result.analysis.results = sortedResults;
                                // This is a bit of a hack to force re-render, ideally state should be managed better.
                                setShowAll(s => !s); setTimeout(() => setShowAll(s => !s), 0);
                            }, children: _jsx(ArrowUpDown, { size: 16 }) })] }), _jsx("div", { className: "table-wrapper", children: _jsxs("table", { className: "results-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Chỉ số" }), _jsx("th", { children: "Kết quả" }), _jsx("th", { children: "Trạng thái" }), _jsx("th", { children: "Nhận định" })] }) }), _jsx("tbody", { children: filteredResults.map((item, index) => (_jsxs("tr", { className: `status-row-${getStatusClass(item.status)}`, children: [_jsx("td", { "data-label": "Chỉ số", children: item.indicator }), _jsx("td", { "data-label": "Kết quả", children: item.value }), _jsx("td", { "data-label": "Trạng thái", children: _jsx("span", { className: `status-badge ${getStatusClass(item.status)}`, children: item.status }) }), _jsx("td", { "data-label": "Nhận định", children: item.insight })] }, index))) })] }) })] }), recommendations?.supplements && recommendations.supplements.length > 0 && (_jsxs("div", { className: "recommendation-section", children: [_jsxs("h2", { children: [_jsx(Apple, {}), " Gợi ý Bổ sung"] }), _jsx("div", { className: "card-grid", children: recommendations.supplements.map((item) => (_jsxs("div", { className: "product-card", children: [_jsx("h4", { children: item.name }), _jsx("p", { className: "benefit", children: item.benefit }), _jsx("p", { className: "dosage", children: item.dosage })] }, item.name))) })] })), _jsxs("div", { className: "results-actions", children: [_jsx("button", { className: "action-button", onClick: onReset, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [_jsx(RotateCcw, {}), " Phân tích lại"] }) }), _jsx("button", { className: `action-button save-button`, onClick: onSave, disabled: isSaved, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [isSaved ? _jsx(CheckCircle2, {}) : _jsx(History, {}), isSaved ? "Đã lưu" : "Lưu vào Lịch sử"] }) }), _jsx("button", { className: "action-button export-button", onClick: handleExportPDF, disabled: isExporting, children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [isExporting ? _jsx("div", { className: "spinner", style: { width: '20px', height: '20px', borderTopColor: 'white' } }) : _jsx(FileDown, {}), isExporting ? "Đang xuất..." : "Xuất PDF"] }) })] })] })
    );
};

const HistoryView = ({ history, onSelect }) => {
    if (history.length === 0) {
        return _jsx("div", { className: "placeholder-container", children: "Chưa có bản ghi phân tích nào trong lịch sử." });
    }

    const selectedAnalysis = history[0];

    const chartData = {
        labels: history.map(h => new Date(h.date).toLocaleDateString('vi-VN')).reverse(),
        datasets: [
            {
                label: 'Điểm Sức khỏe',
                data: history.map(h => h.analysis.health_score).reverse(),
                fill: true,
                backgroundColor: 'rgba(90, 138, 58, 0.2)',
                borderColor: 'rgba(90, 138, 58, 1)',
                tension: 0.3,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
            },
        },
        plugins: {
            legend: {
                display: false,
            },
        },
    };

    return (_jsxs("div", { className: "history-container", children: [_jsxs("h2", { children: [_jsx(History, { "aria-hidden": "true" }), " Lịch sử Phân tích"] }), _jsx("div", { className: "history-chart-container", children: _jsx(Line, { data: chartData, options: chartOptions }) }), _jsx(ResultsDisplay, { result: selectedAnalysis, onReset: () => onSelect(null), onSave: () => {}, isSaved: true })] }));
};

const PlannerView = ({ lastAnalysis }) => {
    const [activePlannerTab, setActivePlannerTab] = useState('meal');
    const [mealPlan, setMealPlan] = useState(null);
    const [workoutPlan, setWorkoutPlan] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [planRequest, setPlanRequest] = useState('');
    const [workoutMode, setWorkoutMode] = useState('gym');
    const tableContainerRef = useRef(null);
    const [hasScroll, setHasScroll] = useState(false);

    const checkScroll = () => {
        const el = tableContainerRef.current;
        if (el) {
            const hasHorizontalScrollbar = el.scrollWidth > el.clientWidth;
            setHasScroll(hasHorizontalScrollbar);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [mealPlan, workoutPlan]);

    const handleScroll = (direction) => {
        if (tableContainerRef.current) {
            const scrollAmount = tableContainerRef.current.clientWidth * 0.8;
            tableContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };
    
    const generatePlan = async () => {
        if (!lastAnalysis && !planRequest) {
            setError('Vui lòng nhập yêu cầu hoặc thực hiện phân tích trước.');
            return;
        }
        setIsLoading(true);
        setError('');
        setMealPlan(null);
        setWorkoutPlan(null);

        const basePrompt = lastAnalysis ? `Dựa trên kết quả phân tích sức khỏe này: ${JSON.stringify(lastAnalysis.analysis.category_scores)} và thông tin người dùng: ${JSON.stringify(lastAnalysis.userInfo)}` : '';
        const userRequest = planRequest ? ` Hãy xem xét yêu cầu cụ thể sau: "${planRequest}".` : ' Hãy tạo một kế hoạch phù hợp.';
        
        try {
            if (activePlannerTab === 'meal') {
                const prompt = `${basePrompt}, hãy tạo một kế hoạch thực đơn chi tiết cho 7 ngày tới để cải thiện sức khỏe. ${userRequest} Cung cấp các món ăn cụ thể cho bữa sáng, trưa, tối và một mẹo sức khỏe hàng ngày.`;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: PLAN_SCHEMA,
                    }
                });
                const parsedResponse = JSON.parse(response.text);
                setMealPlan(parsedResponse.plan);
            } else {
                const prompt = `${basePrompt}, hãy tạo một kế hoạch tập luyện chi tiết cho 7 ngày tới, tập trung vào ${workoutMode === 'gym' ? 'tập gym' : 'tập tại nhà'}. ${userRequest} Bao gồm các bài tập, số hiệp, số lần lặp lại và ghi rõ ngày nào là ngày nghỉ ngơi.`;
                 const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: WORKOUT_PLAN_SCHEMA,
                    }
                });
                const parsedResponse = JSON.parse(response.text);
                setWorkoutPlan(parsedResponse.workout_plan);
            }
        } catch (err) {
            console.error(err);
            setError('Đã xảy ra lỗi khi tạo kế hoạch. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        _jsxs("div", { className: "planner-container", children: [_jsxs("h2", { children: [_jsx(CalendarDays, {}), " Lập Kế hoạch Cá nhân"] }), _jsx("div", { className: "planner-view-container", children: [_jsxs("div", { className: "planner-tabs", children: [_jsxs("button", { className: `planner-tab ${activePlannerTab === 'meal' ? 'active' : ''}`, onClick: () => setActivePlannerTab('meal'), children: [_jsx(Carrot, { size: 20 }), " Thực đơn"] }), _jsxs("button", { className: `planner-tab ${activePlannerTab === 'workout' ? 'active' : ''}`, onClick: () => setActivePlannerTab('workout'), children: [_jsx(Dumbbell, { size: 20 }), " Lịch tập"] })] }), _jsxs("div", { className: "planner-controls", children: [_jsxs("div", { className: "plan-request-input-group", children: [_jsx("label", { htmlFor: "plan-request", children: "Yêu cầu bổ sung (tùy chọn)" }), _jsx("input", { id: "plan-request", className: "plan-request-input", type: "text", value: planRequest, onChange: (e) => setPlanRequest(e.target.value), placeholder: "VD: Tôi muốn giảm cân, không ăn cay" })] }), activePlannerTab === 'workout' && _jsx("div", { className: "plan-request-input-group", children: [_jsx("label", { children: "Chế độ tập" }), _jsxs("div", { className: "workout-mode-selector", children: [_jsx("button", { className: workoutMode === 'gym' ? 'active' : '', onClick: () => setWorkoutMode('gym'), children: "Gym" }), _jsx("button", { className: workoutMode === 'home' ? 'active' : '', onClick: () => setWorkoutMode('home'), children: "Tại nhà" })] })] }), _jsx("button", { className: "generate-button", onClick: generatePlan, disabled: isLoading, children: isLoading ? _jsx("div", { className: "spinner", style: { width: '20px', height: '20px', borderTopColor: 'white' } }) : _jsxs(React.Fragment, { children: [_jsx(Sparkles, { size: 18 }), " Tạo kế hoạch"] }) })] })] }), isLoading && _jsxs("div", { className: "loading-container", children: [_jsx("div", { className: "spinner" }), _jsx("p", { children: "AI đang xây dựng kế hoạch cho bạn..." })] }), error && _jsxs("div", { className: "error-container small", children: [_jsx("p", { children: error }), !lastAnalysis && _jsx("p", { style: {fontSize: '0.9rem'}, children: "Hãy thử nhập yêu cầu trực tiếp vào ô bên trên." })] }), !isLoading && !error && (activePlannerTab === 'meal' ? mealPlan ? _jsx(MealPlanDisplay, { plan: mealPlan, tableContainerRef: tableContainerRef, hasScroll: hasScroll, handleScroll: handleScroll }) : _jsx(PlannerPlaceholder, { type: "thực đơn" }) : workoutPlan ? _jsx(WorkoutPlanDisplay, { plan: workoutPlan, tableContainerRef: tableContainerRef, hasScroll: hasScroll, handleScroll: handleScroll }) : _jsx(PlannerPlaceholder, { type: "lịch tập" }))] })
    );
};

const PlannerPlaceholder = ({ type }) => (
    _jsxs("div", { className: "placeholder-container", children: [_jsx(Bot, { size: 40 }), _jsxs("p", { children: ["Tạo ", _jsx("strong", { children: type }), " cá nhân hóa"] }), _jsx("span", { children: "Sử dụng kết quả phân tích gần nhất hoặc nhập yêu cầu của bạn để AI tạo kế hoạch." })] })
);

const PlanTableWrapper = ({ title, children, tableContainerRef, hasScroll, handleScroll }) => (
    _jsxs("div", { className: "plan-display-outer-container", children: [_jsx("h3", { className: "plan-table-title", children: title }), _jsxs("div", { className: `plan-table-with-controls-wrapper ${hasScroll ? 'has-scroll' : ''}`, children: [_jsx("button", { className: "scroll-button scroll-button-left", onClick: () => handleScroll('left'), "aria-label": "Cuộn sang trái", children: _jsx(ChevronLeft, {}) }), _jsx("div", { className: "plan-table-container", ref: tableContainerRef, children: children }), _jsx("button", { className: "scroll-button scroll-button-right", onClick: () => handleScroll('right'), "aria-label": "Cuộn sang phải", children: _jsx(ChevronRight, {}) })] })] })
);

const MealPlanDisplay = ({ plan, ...props }) => (
    _jsx(PlanTableWrapper, { title: "Kế hoạch Thực đơn 7 ngày", ...props, children: _jsxs("table", { className: "plan-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Bữa ăn" }), plan.map(dayPlan => _jsx("th", { key: dayPlan.day, children: dayPlan.day }))] }) }), _jsxs("tbody", { children: [
        ...["Bữa sáng", "Bữa trưa", "Bữa tối"].map(mealType => (_jsxs("tr", { children: [
            _jsx("td", { className: "meal-label", children: mealType }),
            ...plan.map(dayPlan => {
                const meal = dayPlan.meals.find(m => m.meal === mealType);
                return (_jsx("td", { key: dayPlan.day, children: meal?.dishes.map((dish, index) => (_jsxs("div", { children: [
                    _jsx("p", { className: "dish-name", children: dish.name }),
                    dish.notes && _jsx("p", { className: "dish-notes", children: dish.notes })
                ] }, index))) }));
            })
        ] }, mealType))),
        _jsxs("tr", { children: [
            _jsx("td", { className: "meal-label", children: "Mẹo" }),
            ...plan.map(dayPlan => (_jsx("td", { key: dayPlan.day, children: _jsxs("div", { className: "daily-tip-cell", children: [
                _jsx(Sparkles, { size: 16, className: "icon" }),
                _jsx("span", { children: dayPlan.daily_tip })
            ] }) })))
        ] })
    ] })] }) })
);

const WorkoutPlanDisplay = ({ plan, ...props }) => (
    _jsx(PlanTableWrapper, { title: "Kế hoạch Tập luyện 7 ngày", ...props, children: _jsxs("table", { className: "plan-table", children: [_jsx("thead", { children: _jsxs("tr", { children: plan.map(dayPlan => _jsx("th", { key: dayPlan.day, children: dayPlan.day })) }) }), _jsx("tbody", { children: _jsx("tr", { children: plan.map(dayPlan => (_jsx("td", { key: dayPlan.day, children: dayPlan.exercises && dayPlan.exercises.length > 0 ? _jsxs(React.Fragment, { children: [_jsx("div", { className: "workout-focus-chip", children: dayPlan.focus }), _jsx("ul", { className: "exercise-list", children: dayPlan.exercises.map((ex, index) => (_jsxs("li", { children: [_jsx("strong", { children: ex.name }), _jsx("br", {}), _jsx("span", { children: ex.sets_reps })] }, index))) })] }) : _jsxs(React.Fragment, { children: [_jsx("div", { className: "workout-focus-chip rest-day-chip", children: dayPlan.focus }), _jsx("p", { className: "rest-day-text", children: "Nghỉ ngơi và phục hồi" })] }) }))) })] })] }) })
);

const OverviewScreen = ({ user, onStartAnalysis }) => (
    _jsxs("div", { className: "placeholder-container", style: { minHeight: '60vh', justifyContent: 'center', display: 'flex', flexDirection: 'column' }, children: [_jsx(Sparkles, { size: 48, style: { color: 'var(--primary-color)', margin: '0 auto 1rem' } }), _jsx("h2", { style: { color: 'var(--primary-color)'}, children: "Chào mừng trở lại!" }), _jsx("p", { children: "Bắt đầu một phân tích mới để theo dõi sức khỏe của bạn hoặc xem lại các kế hoạch được cá nhân hóa." }), _jsx("button", { className: "submit-button", style: { marginTop: '1.5rem', alignSelf: 'center', padding: '0.75rem 1.5rem' }, onClick: onStartAnalysis, children: "Bắt đầu Phân tích Mới" })] })
);

const ProfileScreen = ({ user, onSignOut, theme, toggleTheme }) => (
    _jsxs("div", { className: "profile-container", children: [_jsxs("h2", { children: [_jsx(User, {}), " Hồ sơ cá nhân"] }), _jsxs("div", { className: "profile-header", children: [_jsx("div", { className: "profile-avatar", children: _jsx(User, { size: 40 }) }), _jsx("p", { className: "profile-email", children: user.email })] }), _jsxs("div", { className: "profile-actions", children: [_jsxs("button", { className: "profile-action-button", onClick: toggleTheme, children: [theme === 'dark' ? _jsx(Sun, {}) : _jsx(Moon, {}), _jsxs("span", { children: ["Chế độ ", theme === 'dark' ? 'Sáng' : 'Tối'] })] }), _jsxs("button", { className: "profile-action-button logout", onClick: onSignOut, children: [_jsx(LogOut, {}), "Đăng xuất"] })] })] })
);

const AnalysisFlow = ({ onAnalysisComplete }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [files, setFiles] = useState<File[]>([]);
    const [userInfo, setUserInfo] = useState(null);
    const [isSaved, setIsSaved] = useState(false);

    const handleAnalyze = async (userData) => {
        setIsLoading(true);
        setError('');
        setAnalysisResult(null);
        setUserInfo(userData);
        setIsSaved(false);

        try {
            const imageParts = await Promise.all(files.map(fileToGenerativePart));
            const prompt = `Phân tích kết quả xét nghiệm máu từ các hình ảnh hoặc văn bản được cung cấp. Thông tin bệnh nhân: tuổi ${userData.age}, chiều cao ${userData.height} cm, cân nặng ${userData.weight} kg, giới tính ${userData.gender}, công việc ${userData.occupation}. Vui lòng trả về kết quả dưới dạng JSON theo schema đã cung cấp.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [...imageParts, { text: prompt }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: CATEGORY_SCORES_SCHEMA,
                }
            });

            const parsedResult = JSON.parse(response.text);
            setAnalysisResult({
                analysis: parsedResult,
                userInfo: userData,
                date: new Date().toISOString()
            });

        } catch (err) {
            console.error("Lỗi phân tích:", err);
            setError("Không thể phân tích kết quả. Vui lòng kiểm tra lại hình ảnh hoặc thử lại sau.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setAnalysisResult(null);
        setFiles([]);
        setError('');
        setIsLoading(false);
    };

    const handleSave = () => {
        if (analysisResult) {
            onAnalysisComplete(analysisResult);
            setIsSaved(true);
        }
    };
    
    if (isLoading) {
        return _jsxs("div", { className: "loading-container", children: [_jsx("div", { className: "spinner" }), _jsx("p", { children: "AI đang phân tích kết quả của bạn..." })] });
    }
    if (error) {
        return _jsxs("div", { className: "error-container", children: [_jsx("p", { children: error }), _jsx("button", { className: "action-button", onClick: handleReset, children: "Thử lại" })] });
    }
    if (analysisResult) {
        return _jsx(ResultsDisplay, { result: analysisResult, onReset: handleReset, onSave: handleSave, isSaved: isSaved });
    }
    return _jsx(AnalysisForm, { onAnalyze: handleAnalyze, isLoading: isLoading, files: files, setFiles: setFiles });
};


const BottomNav = ({ activeView, setActiveView }) => {
    const navItems = [
        { id: 'overview', icon: Home, label: 'Tổng quan' },
        { id: 'history', icon: History, label: 'Lịch sử' },
        { id: 'add', icon: Plus, label: 'Thêm' },
        { id: 'planner', icon: CalendarDays, label: 'Kế hoạch' },
        { id: 'profile', icon: User, label: 'Hồ sơ' }
    ];

    return (
        _jsx("nav", { className: "bottom-nav", children: navItems.map(item => {
            const Icon = item.icon;
            if (item.id === 'add') {
                return (_jsx("div", { className: "nav-add-button-wrapper", children: _jsx("button", { className: "nav-add-button", "aria-label": "Thêm phân tích mới", onClick: () => setActiveView('add'), children: _jsx(Icon, { className: "icon", size: 32 }) }) }, item.id));
            }
            return (_jsxs("button", { className: `nav-button ${activeView === item.id ? 'active' : ''}`, onClick: () => setActiveView(item.id), children: [_jsx(Icon, { size: 24 }), _jsx("span", { children: item.label })] }, item.id));
        }) })
    );
};


const App = () => {
    const [authState, setAuthState] = useState('loading'); // 'loading', 'signedOut', 'signedIn'
    const [user, setUser] = useState(null);
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [authError, setAuthError] = useState('');
    
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    
    const [history, setHistory] = useState(() => {
        try {
            const savedHistory = localStorage.getItem('analysisHistory');
            return savedHistory ? JSON.parse(savedHistory) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    useEffect(() => {
        // Mock auth state check
        setTimeout(() => {
            const mockUser = localStorage.getItem('mockUser');
            if (mockUser) {
                setUser(JSON.parse(mockUser));
                setAuthState('signedIn');
            } else {
                setAuthState('signedOut');
            }
        }, 500);
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('analysisHistory', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history to localStorage", e);
        }
    }, [history]);

    const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');

    const handleSignUp = (email, password) => {
        setAuthError('');
        const mockUser = { email };
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        setUser(mockUser);
        setAuthState('signedIn');
    };

    const handleSignIn = (email, password) => {
        setAuthError('');
        const mockUser = { email };
        localStorage.setItem('mockUser', JSON.stringify(mockUser));
        setUser(mockUser);
        setAuthState('signedIn');
    };

    const handleSignOut = () => {
        localStorage.removeItem('mockUser');
        setUser(null);
        setAuthState('signedOut');
        setActiveView('overview');
    };

    const addAnalysisToHistory = (newAnalysis) => {
        setHistory(prev => [newAnalysis, ...prev]);
    };

    const [activeView, setActiveView] = useState('overview');
    
    const renderContent = () => {
        switch(activeView) {
            case 'overview':
                return _jsx(OverviewScreen, { user: user, onStartAnalysis: () => setActiveView('add') });
            case 'history':
                return _jsx(HistoryView, { history: history, onSelect: () => {} });
            case 'add':
                return _jsx(AnalysisFlow, { onAnalysisComplete: addAnalysisToHistory });
            case 'planner':
                return _jsx(PlannerView, { lastAnalysis: history.length > 0 ? history[0] : null });
            case 'profile':
                return _jsx(ProfileScreen, { user: user, onSignOut: handleSignOut, theme: theme, toggleTheme: toggleTheme });
            default:
                return _jsx(OverviewScreen, { user: user, onStartAnalysis: () => setActiveView('add') });
        }
    };

    if (authState === 'loading') {
        return _jsx("div", { className: "loading-container", children: _jsx("div", { className: "spinner" }) });
    }

    return (
        _jsx("div", { className: "app-wrapper", children: authState === 'signedOut' ? (_jsx(AuthScreen, { onSignIn: handleSignIn, onSignUp: handleSignUp, isSigningUp: isSigningUp, setIsSigningUp: setIsSigningUp, error: authError })) : (_jsxs(React.Fragment, { children: [_jsx("div", { className: "container", children: renderContent() }), _jsx(BottomNav, { activeView: activeView, setActiveView: setActiveView })] })) })
    );
};

const root = createRoot(document.getElementById('root'));
root.render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
