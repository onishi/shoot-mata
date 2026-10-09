import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
const overlay = document.querySelector<HTMLDivElement>('#overlay');
const primary = document.querySelector<HTMLButtonElement>('#primary');
if (!canvas || !overlay || !primary) throw new Error('Required game elements are missing');
const context = canvas.getContext('2d');
if (!context) throw new Error('Canvas 2D is unavailable');
const ctx: CanvasRenderingContext2D = context;

function draw(): void {
  ctx.fillStyle = '#090e20';
  ctx.fillRect(0, 0, 960, 540);
  ctx.strokeStyle = '#172344';
  for (let x = 0; x <= 960; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 540); ctx.stroke();
  }
  ctx.fillStyle = '#55e2ef';
  ctx.beginPath(); ctx.moveTo(180, 270); ctx.lineTo(135, 248); ctx.lineTo(145, 270); ctx.lineTo(135, 292); ctx.closePath(); ctx.fill();
}
draw();
primary.addEventListener('click', () => { overlay.hidden = true; });
