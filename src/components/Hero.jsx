import { useNavigate } from "react-router-dom";
import "./Hero.css";

function Hero() {
  const navigate = useNavigate();

  const goToSignUp = () => {
    navigate("/signup");
  };

  return (
    <section className="hero">
      <div className="hero-content">
        <h1>Onlayn ta'limni yangi darajaga olib chiqing</h1>
        <p>Istalgan joyda, istalgan vaqtda zamonaviy kurslar orqali bilim oling</p>

        <div className="hero-buttons">
          <button className="btn primary" onClick={goToSignUp}>
            Boshlash
          </button>

          <button className="btn secondary" onClick={goToSignUp}>
            Kurslarni ko'rish
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;
