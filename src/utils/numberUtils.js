


const safeNumber = (value, defaultValue = 0) => {
	const num = Number(value);
	return isNaN(num) ? defaultValue : num;
}

const fmt = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });


export { fmt, safeNumber }
