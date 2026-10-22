<script setup lang="ts">
import { IconChevronDown, IconReceipt, IconShieldCheck } from '@tabler/icons-vue';
import type { UnwrapRef } from 'vue';
import type { useBatchDraft } from '../../features/batches/useBatchDraft';
import { lineTotal } from '#shared/utils/finance';
import { idr, kg } from '../../utils/workspace-format';
defineProps<{ model: UnwrapRef<ReturnType<typeof useBatchDraft>> }>();
</script>
<template>
  <section class="hpp-card" aria-label="Estimasi HPP batch">
    <div class="hpp-overview">
      <div>
        <span class="hpp-label">HPP estimasi per kg <span class="estimate">Estimasi</span></span
        ><strong class="hpp-value"
          >{{ model.hpp === null ? '—' : idr(model.hpp)
          }}<small v-if="model.hpp !== null"> / kg</small></strong
        >
        <p>
          {{
            model.hpp === null
              ? 'Isi bobot dan harga produk untuk melihat estimasi HPP.'
              : 'Otomatis diperbarui dari pembelian dan biaya perjalanan.'
          }}
        </p>
      </div>
      <span class="hpp-icon"><IconReceipt :size="24" stroke-width="1.5" /></span>
    </div>
    <details class="hpp-details" open>
      <summary>Rincian pembentuk HPP <IconChevronDown :size="16" /></summary>
      <div class="hpp-breakdown">
        <div class="hpp-group-title">Pembelian ikan</div>
        <div v-for="(product, index) in model.products" :key="product.key" class="hpp-line">
          <div>
            <strong
              >{{ product.fish || `Produk ${index + 1}`
              }}<span v-if="product.size"> · Size {{ product.size }}</span></strong
            ><small>{{ kg(product.weight || 0) }} kg × {{ idr(product.price || 0) }} / kg</small>
          </div>
          <strong>{{ idr(lineTotal(product.weight, product.price)) }}</strong>
        </div>
        <div class="hpp-line hpp-subtotal">
          <span>Total pembelian</span><strong>{{ idr(model.total) }}</strong>
        </div>
        <div class="hpp-group-title">Biaya perjalanan</div>
        <div v-for="expense in model.expenses" :key="expense.id" class="hpp-line">
          <div>
            <strong>{{ expense.category }}</strong
            ><small v-if="expense.description">{{ expense.description }}</small>
          </div>
          <strong>{{ idr(expense.price || 0) }}</strong>
        </div>
        <p v-if="!model.expenses.length" class="hpp-empty">
          Belum ada biaya perjalanan. Tambahkan tol, BBM, es, atau biaya lainnya di bawah.
        </p>
        <div class="hpp-line hpp-subtotal">
          <span>Total biaya perjalanan</span><strong>{{ idr(model.expenseTotal) }}</strong>
        </div>
        <div class="hpp-calculation">
          <div>
            <span>Total modal batch</span
            ><strong>{{ idr(model.total.plus(model.expenseTotal)) }}</strong>
          </div>
          <div>
            <span>Total bobot beli</span><strong>{{ kg(model.weight) }} kg</strong>
          </div>
          <div class="hpp-result">
            <span>Modal ÷ bobot beli</span
            ><strong>{{ model.hpp === null ? '—' : `${idr(model.hpp)} / kg` }}</strong>
          </div>
        </div>
      </div>
    </details>
    <section class="product-hpps">
      <h2>HPP estimasi per produk</h2>
      <p>
        Biaya perjalanan dialokasikan sesuai proporsi bobot beli. Ikan dan size yang sama digabung.
      </p>
      <div
        v-for="row in model.productHpps"
        :key="JSON.stringify([row.fish, row.size])"
        class="product-hpp-row"
      >
        <div class="product-hpp-title">
          <strong>{{ row.fish }} · Size {{ row.size }}</strong
          ><small>{{ kg(row.weight) }} kg</small>
        </div>
        <div class="product-hpp-amount">
          {{ row.hpp === null ? 'Lengkapi bobot dan harga' : idr(row.hpp)
          }}<small v-if="row.hpp !== null"> / kg</small>
        </div>
        <div class="product-hpp-detail">
          <span>Harga beli rata-rata / kg</span
          ><strong>{{ row.purchasePerKg === null ? '—' : idr(row.purchasePerKg) }}</strong>
        </div>
        <div class="product-hpp-detail">
          <span>Biaya perjalanan / kg</span
          ><strong>{{ row.expensePerKg === null ? '—' : idr(row.expensePerKg) }}</strong>
        </div>
        <div class="product-hpp-detail">
          <span>Alokasi biaya produk</span><strong>{{ idr(row.allocation) }}</strong>
        </div>
      </div>
      <p v-if="!model.productHpps.length" class="hpp-empty">
        Pilih ikan dan size untuk melihat rincian HPP per produk.
      </p>
    </section>
    <p class="hpp-note">
      <IconShieldCheck :size="15" /> HPP berbasis bobot beli selalu diperbarui. HPP efektif berbasis
      bobot terjual tersedia di detail batch.
    </p>
  </section>
</template>
