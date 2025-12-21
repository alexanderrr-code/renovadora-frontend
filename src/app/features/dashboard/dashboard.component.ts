import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardStats } from '../../core/models/dashboard.model';
import { Router, NavigationEnd } from '@angular/router'; // ✅ Agregar
import { filter } from 'rxjs/operators'; // ✅ Agregar

// Registrar componentes necesarios de ECharts
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  LineChart,
  PieChart,
  CanvasRenderer
]);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    NgxEchartsDirective
  ],
  providers: [
    provideEchartsCore({ echarts })
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private router = inject(Router); // ✅ Agregar Router
  
  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Opciones de los gráficos
  chartIngresos7Dias: EChartsOption = {};
  chartEstadoOrdenes: EChartsOption = {};
  chartIngresosMensuales: EChartsOption = {};

  ngOnInit() {
    console.log('Dashboard iniciado');
    this.cargarEstadisticas();
    
    // ✅ NUEVO: Recargar cuando se navega al dashboard
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        if (event.url === '/dashboard' || event.url === '/') {
          console.log('Navegación a dashboard detectada, recargando datos...');
          this.cargarEstadisticas();
        }
      });
  }

  cargarEstadisticas() {
    console.log('Intentando cargar estadísticas...');
    this.loading.set(true);
    this.error.set(null);
    
    this.dashboardService.obtenerEstadisticas().subscribe({
      next: (data) => {
        console.log('✅ Estadísticas recibidas:', data);
        this.stats.set(data);
        this.inicializarGraficos(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('❌ Error al cargar estadísticas:', error);
        this.error.set('No se pudieron cargar las estadísticas. Verifica que el backend esté corriendo.');
        this.loading.set(false);
      }
    });
  }

  obtenerFechaActual(): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fecha = new Date();
    return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
  }

  inicializarGraficos(stats: DashboardStats) {
    console.log('Inicializando gráficos con stats:', stats);
    
    // Gráfico: Ingresos últimos 7 días
    this.chartIngresos7Dias = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      },
      yAxis: { 
        type: 'value', 
        name: 'Soles (S/.)',
        minInterval: 1
      },
      series: [{
        data: [0, 0, 0, 0, 0, 0, stats.ingresosHoy || 0],
        type: 'line',
        smooth: true,
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
              { offset: 1, color: 'rgba(102, 126, 234, 0.1)' }
            ]
          }
        },
        itemStyle: { color: '#667eea' }
      }]
    };
    console.log('✅ Gráfico 1 inicializado');

    // Gráfico: Estado de órdenes activas
    const totalOrdenes = (stats.ordenesPendientes || 0) + (stats.ordenesEnProceso || 0) + (stats.ordenesListas || 0) + (stats.ordenesEntregadas || 0);
    
    this.chartEstadoOrdenes = {
      tooltip: { 
        trigger: 'item', 
        formatter: '{b}: {c} ({d}%)' 
      },
      legend: { 
        orient: 'vertical', 
        right: '5%',  // ✅ Más margen a la derecha
        top: 'center',
        itemGap: 15,  // ✅ Más espacio entre items
        textStyle: {
          fontSize: 13,
          fontWeight: 500
        }
      },
      series: [{
        type: 'pie',
        radius: ['40%', '65%'],  // ✅ Radio más pequeño
        center: ['40%', '50%'],  // ✅ Centrar más a la izquierda
        avoidLabelOverlap: true,
        itemStyle: { 
          borderRadius: 8, 
          borderColor: '#fff', 
          borderWidth: 2 
        },
        label: { 
          show: true,
          formatter: '{b}\n{c}',
          fontSize: 12,
          // ✅ NUEVO: Configurar posición de etiquetas
          position: 'outer',
          alignTo: 'none',
          edgeDistance: 15,
          distanceToLabelLine: 5
        },
        labelLine: {
          show: true,
          length: 15,      // ✅ Línea corta
          length2: 10,     // ✅ Segunda línea corta
          smooth: false,
          lineStyle: {
            width: 1
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        data: totalOrdenes > 0 ? [
          { value: stats.ordenesPendientes || 0, name: 'Pendiente', itemStyle: { color: '#FF9800' } },
          { value: stats.ordenesEnProceso || 0, name: 'En Proceso', itemStyle: { color: '#2196F3' } },
          { value: stats.ordenesListas || 0, name: 'Listo', itemStyle: { color: '#4CAF50' } },
          { value: stats.ordenesEntregadas || 0, name: 'Entregado', itemStyle: { color: '#9E9E9E' } }
        ] : [
          { value: 1, name: 'Sin datos', itemStyle: { color: '#CCCCCC' } }
        ]
      }]
    };
    console.log('✅ Gráfico 2 inicializado');

    // Gráfico: Ingresos mensuales 2024
    this.chartIngresosMensuales = {
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      },
      yAxis: { 
        type: 'value', 
        name: 'Soles (S/.)',
        minInterval: 1
      },
      series: [{
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, stats.ingresosMes || 0],
        type: 'bar',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#667eea' },
              { offset: 1, color: '#764ba2' }
            ]
          },
          borderRadius: [6, 6, 0, 0]
        }
      }]
    };
    console.log('✅ Gráfico 3 inicializado');
    console.log('✅ Todos los gráficos inicializados correctamente');
  }
}