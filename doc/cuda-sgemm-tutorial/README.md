# CUDA矩阵乘法(SGEMM)终极优化：从入门到接近cuBLAS的交互式可视化教程

> 本教程通过**纯原生 HTML5 Canvas + JavaScript 交互式可视化**，带你从零理解 GPU 矩阵乘法（SGEMM）的优化之路。每个核心概念都配有可在浏览器直接运行的独立 HTML 演示。

## 大纲

| 章节 | 标题 | 交互式演示文件 | 核心概念 |
|------|------|----------------|----------|
| 前言 | GPU 内存层级基础 | `01-gpu-memory-hierarchy.html` | GMEM → SMEM → Registers，带宽与延迟 |
| 步骤 1 | Naive SGEMM | `02-naive-sgemm.html` | 朴素实现，线程-元素映射，性能瓶颈分析 |
| 步骤 2 | Global Memory Coalescing | `03-memory-coalescing.html` | 合并访存，128B 事务，线程ID→地址映射 |
| 步骤 3 | Shared Memory Caching & Block Tiling | *(后续轮次)* | 共享内存分块，数据复用 |
| 步骤 4 | Vectorized Memory Access | *(后续轮次)* | `float4` 向量化访存 |
| 步骤 5 | Warp Tiling & CUTLASS 抽象 | *(后续轮次)* | Threadblock → Warp → Instruction 层次 |
| 附录 | 性能对比总览 | `04-performance-chart.html` | 各优化阶段 GFLOPs 柱状图 |

---

## 前言：GPU 内存层级——理解性能上限的起点

### 为什么要了解内存层级？

在 GPU 编程中，**计算不是瓶颈，数据搬运才是**。一个 NVIDIA GPU（如 A100）的峰值算力可达 19.5 TFLOPS（FP32），但全局内存（Global Memory / GMEM）的带宽仅有约 2 TB/s。这意味着：

- 如果你的 kernel 每做一次乘加运算就需要从全局内存读取两个 float（8 字节），那你的计算强度（Arithmetic Intensity）仅为 `2 FLOPs / 8 Bytes = 0.25 FLOP/Byte`。
- 根据 Roofline 模型，此时**内存带宽**会将你的实际性能限制在 `0.25 FLOP/Byte × 2000 GB/s = 500 GFLOPS`，远低于 19.5 TFLOPS 的峰值。

因此，优化 SGEMM 的核心思路就是：**减少对慢速 GMEM 的访问，充分利用快速的 SMEM（共享内存）和寄存器（Registers）**。

### GPU 三级内存层级

| 层级 | 名称 | 容量（典型值） | 带宽 | 延迟 | 作用域 |
|------|------|----------------|------|------|--------|
| L1 | Registers（寄存器） | ~256 KB/SM | ~20 TB/s | ~1 cycle | 单线程私有 |
| L2 | Shared Memory（SMEM） | 48–164 KB/SM | ~19 TB/s | ~20 cycles | Block 内共享 |
| L3 | Global Memory（GMEM） | 40–80 GB | 1.5–2 TB/s | ~400 cycles | 全局可见 |

> 📌 **打开 [`01-gpu-memory-hierarchy.html`](01-gpu-memory-hierarchy.html)**，拖动"访问位置"滑块，直观感受不同内存层级的延迟和带宽差异。动画中的数据包从 SM 核心出发，穿越不同层级到达目标——越远的层级，路径越长、传输越慢。

### Roofline 模型直觉

- **计算强度**（Arithmetic Intensity, AI）= FLOPs / Bytes Accessed
- 当 AI 低于"拐点"（= 峰值算力 / 内存带宽）时，kernel 处于**内存受限**状态
- SGEMM 优化的本质：通过 Tiling + 数据复用，将有效 AI 从 0.25 提升到接近硬件拐点

---

## 步骤 1：Naive SGEMM——最朴素的实现

### 算法描述

矩阵乘法 `C = A × B`，其中 A 为 M×K 矩阵，B 为 K×N 矩阵，C 为 M×N 矩阵。

朴素 CUDA 实现的思路极其简单：**每个线程负责计算 C 中的一个元素**。

```c
// Naive SGEMM Kernel
__global__ void sgemm_naive(int M, int N, int K,
                            const float *A, const float *B, float *C) {
    int row = blockIdx.y * blockDim.y + threadIdx.y;  // C的行
    int col = blockIdx.x * blockDim.x + threadIdx.x;  // C的列

    if (row < M && col < N) {
        float sum = 0.0f;
        for (int k = 0; k < K; k++) {
            sum += A[row * K + k] * B[k * N + col];
        }
        C[row * N + col] = sum;
    }
}
```

### 线程映射

- 我们使用二维线程块（如 32×32 = 1024 线程/Block）
- `threadIdx.x` 对应列方向，`threadIdx.y` 对应行方向
- 每个线程遍历 K 维度，累加 A 的一行与 B 的一列的点积

### 痛点分析：为什么这么慢？

> 📌 **打开 [`02-naive-sgemm.html`](02-naive-sgemm.html)**，点击"播放"按钮观察线程如何逐一从全局内存读取 A 和 B 的元素。注意：
> - 用鼠标**悬停** C 矩阵中的任意元素，可以看到该线程需要读取 A 的哪一整行和 B 的哪一整列（高亮显示）。
> - 拖动 K 值滑块，观察随着 K 增大，每个线程的全局内存访问量如何线性增长。

**关键问题**：

1. **零数据复用**：相邻线程在计算 C 的同一行不同列时，都需要读取 A 的同一行。但每个线程独立地从 GMEM 读取，完全没有复用。对于 M=N=K=4096 的矩阵，GMEM 读取总量为 `2 × M × N × K × 4 Bytes` ≈ 512 GB。

2. **访存效率低**：对矩阵 A，同一个 warp 中的 32 个线程拥有相同的 `threadIdx.y`（即相同的 `row`）但不同的 `threadIdx.x`（即不同的 `col`）。在 K 循环的每一步中，它们都访问相同的地址 `A[row * K + k]`——这是广播（broadcast），而非合并访存，无法充分利用内存带宽。

3. **性能**：在 A100 上，Naive SGEMM 约为 **500 GFLOPS**，仅为峰值性能的 ~2.5%。

---

## 步骤 2：Global Memory Coalescing——合并访存

### 核心思想

GPU 的全局内存控制器以 **32 字节**（或 128 字节的 cache line）为单位执行事务（transaction）。当一个 warp（32 个线程）同时访问内存时：

- **合并访存（Coalesced）**：如果 32 个线程访问的地址是**连续且对齐**的，硬件可以将这些请求合并为最少数量的内存事务（理想情况下仅 1 个 128B 事务即可满足 32 个 float 的请求）。
- **非合并访存（Uncoalesced）**：如果地址分散或有大步长（stride），硬件需要发起多个独立事务，带宽利用率大幅下降。

### 修复方法：交换线程索引

在 Naive 实现中，我们让 `threadIdx.x` 对应列（`col`），`threadIdx.y` 对应行（`row`）。考察对矩阵 B 的访问 `B[k * N + col]`：

- 同一 warp 中的 32 个线程拥有连续的 `threadIdx.x`（即 col 连续）
- 它们访问 `B[k*N + 0], B[k*N + 1], ..., B[k*N + 31]` —— **这是连续的！✅ 合并访存**

但对矩阵 A 的访问 `A[row * K + k]`：

- 同一 warp 中的线程 `row` 值相同（因为 threadIdx.y 相同、threadIdx.x 不同），它们都访问同一个地址 `A[row*K + k]` —— 这实际上是**广播（broadcast）**，在有 L1 cache 的架构上效率还行，但不是最优。

**关键修复**：确保在行优先矩阵中，同一 warp 内的线程在最内层循环中访问的地址是连续的。

```c
// 优化后：确保 B 的列方向合并访存
// 同时利用 Block 尺寸使 A 的访问模式也更友好
__global__ void sgemm_coalesced(int M, int N, int K,
                                const float *A, const float *B, float *C) {
    // 关键：用 blockIdx.x 索引列方向（N维），blockIdx.y 索引行方向（M维）
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    int row = blockIdx.y * blockDim.y + threadIdx.y;

    if (row < M && col < N) {
        float sum = 0.0f;
        for (int k = 0; k < K; k++) {
            sum += A[row * K + k] * B[k * N + col];
        }
        C[row * N + col] = sum;
    }
}
```

> 📌 **打开 [`03-memory-coalescing.html`](03-memory-coalescing.html)**，使用步进按钮逐步推进 K 循环的每一次迭代。观察：
> - **左侧面板**：32 个线程（用不同颜色标记）的内存请求地址
> - **右侧面板**：这些地址如何被打包成 128B 的内存事务
> - **拖动滑块**切换"合并"与"非合并"模式，对比事务数量的显著差异
> - 底部实时显示**带宽利用率**的变化

### 性能收益

通过确保全局内存访问模式的合并性，我们可以获得显著的性能提升：

| 实现 | GFLOPs (A100) | 峰值占比 | 提升倍数 |
|------|---------------|----------|----------|
| Naive SGEMM | ~500 | 2.5% | 1× |
| + Memory Coalescing | ~1,500 | 7.7% | 3× |

虽然 3 倍的提升很可观，但我们仍然只达到了峰值性能的不到 8%。问题的根源在于：**即使访存模式是合并的，我们仍然在从慢速的全局内存中重复读取数据，没有任何复用**。这就是下一步优化——Shared Memory Tiling——要解决的问题。

> 📌 **打开 [`04-performance-chart.html`](04-performance-chart.html)**，查看各优化步骤的性能对比柱状图。鼠标悬停在柱状条上可以看到详细数据和该优化的关键技术点。

---

## 后续预告

| 步骤 | 核心技术 | 预期性能提升 |
|------|----------|-------------|
| 步骤 3 | Shared Memory Tiling | ~8 TFLOPS（40% 峰值） |
| 步骤 4 | float4 向量化访存 | ~12 TFLOPS（60% 峰值） |
| 步骤 5 | Warp Tiling + Register Blocking | ~17 TFLOPS（87% 峰值） |

---

## 参考资料

1. [Simon Böhm - How to Optimize a CUDA Matmul Kernel](https://siboehm.com/articles/22/CUDA-MMM)
2. [wangzyon/NVIDIA_SGEMM_PRACTICE](https://github.com/wangzyon/NVIDIA_SGEMM_PRACTICE)
3. [NVIDIA CUTLASS Blog](https://developer.nvidia.com/blog/cutlass-linear-algebra-cuda/)
