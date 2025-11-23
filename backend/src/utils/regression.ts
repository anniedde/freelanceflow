/**
 * Polynomial regression utility for revenue forecasting
 */

interface DataPoint {
  x: number;
  y: number;
}

/**
 * Fits a polynomial regression model to the data
 * @param data Array of {x, y} points
 * @param degree Degree of polynomial (2 for quadratic, 3 for cubic)
 * @returns Coefficients array [a0, a1, a2, ...] where y = a0 + a1*x + a2*x^2 + ...
 */
export function polynomialRegression(data: DataPoint[], degree: number = 2): number[] {
  const n = data.length;

  if (n < degree + 1) {
    // Not enough data points, fall back to simpler model
    degree = Math.max(1, n - 1);
  }

  // Build the matrix for least squares
  const X: number[][] = [];
  const Y: number[] = [];

  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j <= degree; j++) {
      row.push(Math.pow(data[i].x, j));
    }
    X.push(row);
    Y.push(data[i].y);
  }

  // Solve using normal equations: (X^T * X) * β = X^T * Y
  const XT = transpose(X);
  const XTX = matrixMultiply(XT, X);
  const XTY = matrixVectorMultiply(XT, Y);

  // Solve the system using Gaussian elimination
  const coefficients = gaussianElimination(XTX, XTY);

  return coefficients;
}

/**
 * Predicts y value for given x using polynomial coefficients
 */
export function predict(x: number, coefficients: number[]): number {
  let y = 0;
  for (let i = 0; i < coefficients.length; i++) {
    y += coefficients[i] * Math.pow(x, i);
  }
  return Math.max(0, y); // Revenue can't be negative
}

/**
 * Generate projections for future periods
 */
export function generateProjections(
  historicalData: DataPoint[],
  futurePoints: number,
  degree: number = 2
): DataPoint[] {
  const coefficients = polynomialRegression(historicalData, degree);
  const projections: DataPoint[] = [];

  const lastX = historicalData[historicalData.length - 1]?.x || 0;

  for (let i = 1; i <= futurePoints; i++) {
    const x = lastX + i;
    const y = predict(x, coefficients);
    projections.push({ x, y });
  }

  return projections;
}

/**
 * Calculate R² (coefficient of determination) to measure fit quality
 */
export function calculateR2(data: DataPoint[], coefficients: number[]): number {
  const yMean = data.reduce((sum, point) => sum + point.y, 0) / data.length;

  let ssTotal = 0;
  let ssResidual = 0;

  for (const point of data) {
    const predicted = predict(point.x, coefficients);
    ssTotal += Math.pow(point.y - yMean, 2);
    ssResidual += Math.pow(point.y - predicted, 2);
  }

  return 1 - (ssResidual / ssTotal);
}

// Matrix operations helpers

function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];

  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j];
    }
  }

  return result;
}

function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result: number[][] = [];

  for (let i = 0; i < rowsA; i++) {
    result[i] = [];
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }

  return result;
}

function matrixVectorMultiply(A: number[][], v: number[]): number[] {
  const result: number[] = [];

  for (let i = 0; i < A.length; i++) {
    let sum = 0;
    for (let j = 0; j < v.length; j++) {
      sum += A[i][j] * v[j];
    }
    result[i] = sum;
  }

  return result;
}

function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented: number[][] = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  // Back substitution
  const x: number[] = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }

  return x;
}
