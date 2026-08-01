export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acciones_desarrollo: {
        Row: {
          creado_por: string | null
          created_at: string
          descripcion: string | null
          es_demo: boolean
          estatus: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          medicion_exito: string | null
          monto_inversion: number | null
          observaciones: string | null
          prioridad_id: string
          tipo_accion: string | null
          ultima_actualizacion: string | null
          updated_at: string
          via_aprendizaje: string | null
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          medicion_exito?: string | null
          monto_inversion?: number | null
          observaciones?: string | null
          prioridad_id: string
          tipo_accion?: string | null
          ultima_actualizacion?: string | null
          updated_at?: string
          via_aprendizaje?: string | null
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          medicion_exito?: string | null
          monto_inversion?: number | null
          observaciones?: string | null
          prioridad_id?: string
          tipo_accion?: string | null
          ultima_actualizacion?: string | null
          updated_at?: string
          via_aprendizaje?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acciones_desarrollo_prioridad_id_fkey"
            columns: ["prioridad_id"]
            isOneToOne: false
            referencedRelation: "prioridades_desarrollo"
            referencedColumns: ["id"]
          },
        ]
      }
      agendas_desarrollo: {
        Row: {
          autorizada_por: string | null
          avance_pct: number
          ciclo: string | null
          colaborador_id: string | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          estatus: string
          fecha_autorizacion: string | null
          id: string
          updated_at: string
          vb_lider_en: string | null
          vb_lider_por: string | null
          vb_talento_en: string | null
          vb_talento_por: string | null
        }
        Insert: {
          autorizada_por?: string | null
          avance_pct?: number
          ciclo?: string | null
          colaborador_id?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_autorizacion?: string | null
          id?: string
          updated_at?: string
          vb_lider_en?: string | null
          vb_lider_por?: string | null
          vb_talento_en?: string | null
          vb_talento_por?: string | null
        }
        Update: {
          autorizada_por?: string | null
          avance_pct?: number
          ciclo?: string | null
          colaborador_id?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_autorizacion?: string | null
          id?: string
          updated_at?: string
          vb_lider_en?: string | null
          vb_lider_por?: string | null
          vb_talento_en?: string | null
          vb_talento_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendas_desarrollo_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          aprobado_por: string | null
          creado_por: string | null
          created_at: string
          entrada: Json | null
          es_demo: boolean
          estatus: string
          id: string
          modelo: string | null
          salida: Json | null
          tarea: string | null
          tokens: number | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          aprobado_por?: string | null
          creado_por?: string | null
          created_at?: string
          entrada?: Json | null
          es_demo?: boolean
          estatus?: string
          id?: string
          modelo?: string | null
          salida?: Json | null
          tarea?: string | null
          tokens?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          aprobado_por?: string | null
          creado_por?: string | null
          created_at?: string
          entrada?: Json | null
          es_demo?: boolean
          estatus?: string
          id?: string
          modelo?: string | null
          salida?: Json | null
          tarea?: string | null
          tokens?: number | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      autorreflexion: {
        Row: {
          agenda_id: string
          areas_oportunidad: string[] | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          expectativas_carrera: Json | null
          formacion: Json | null
          fortalezas: string[] | null
          id: string
          movilidad: Json | null
          necesidades_actual: string[] | null
          necesidades_futuro: string[] | null
          updated_at: string
        }
        Insert: {
          agenda_id: string
          areas_oportunidad?: string[] | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          expectativas_carrera?: Json | null
          formacion?: Json | null
          fortalezas?: string[] | null
          id?: string
          movilidad?: Json | null
          necesidades_actual?: string[] | null
          necesidades_futuro?: string[] | null
          updated_at?: string
        }
        Update: {
          agenda_id?: string
          areas_oportunidad?: string[] | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          expectativas_carrera?: Json | null
          formacion?: Json | null
          fortalezas?: string[] | null
          id?: string
          movilidad?: Json | null
          necesidades_actual?: string[] | null
          necesidades_futuro?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autorreflexion_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agendas_desarrollo"
            referencedColumns: ["id"]
          },
        ]
      }
      bitacora_auditoria: {
        Row: {
          accion: string | null
          antes: Json | null
          creado_por: string | null
          created_at: string
          despues: Json | null
          es_demo: boolean
          fecha: string
          id: string
          registro_id: string | null
          tabla: string | null
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          accion?: string | null
          antes?: Json | null
          creado_por?: string | null
          created_at?: string
          despues?: Json | null
          es_demo?: boolean
          fecha?: string
          id?: string
          registro_id?: string | null
          tabla?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string | null
          antes?: Json | null
          creado_por?: string | null
          created_at?: string
          despues?: Json | null
          es_demo?: boolean
          fecha?: string
          id?: string
          registro_id?: string | null
          tabla?: string | null
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      candidatos: {
        Row: {
          correo: string | null
          creado_por: string | null
          created_at: string
          cv_url: string | null
          es_demo: boolean
          estatus: string
          fase_id: string | null
          fecha_ingreso_fase: string | null
          fuente: string | null
          id: string
          motivo_descarte: string | null
          nombre: string
          telefono: string | null
          updated_at: string
          vacante_id: string | null
        }
        Insert: {
          correo?: string | null
          creado_por?: string | null
          created_at?: string
          cv_url?: string | null
          es_demo?: boolean
          estatus?: string
          fase_id?: string | null
          fecha_ingreso_fase?: string | null
          fuente?: string | null
          id?: string
          motivo_descarte?: string | null
          nombre: string
          telefono?: string | null
          updated_at?: string
          vacante_id?: string | null
        }
        Update: {
          correo?: string | null
          creado_por?: string | null
          created_at?: string
          cv_url?: string | null
          es_demo?: boolean
          estatus?: string
          fase_id?: string | null
          fecha_ingreso_fase?: string | null
          fuente?: string | null
          id?: string
          motivo_descarte?: string | null
          nombre?: string
          telefono?: string | null
          updated_at?: string
          vacante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidatos_fase_id_fkey"
            columns: ["fase_id"]
            isOneToOne: false
            referencedRelation: "fases_proceso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidatos_vacante_id_fkey"
            columns: ["vacante_id"]
            isOneToOne: false
            referencedRelation: "vacantes"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_vacaciones_lft: {
        Row: {
          anios_max: number | null
          anios_min: number
          creado_por: string | null
          created_at: string
          dias_ley: number
          es_demo: boolean
          fuente: string
          id: string
          nota: string | null
          requiere_vb_juridico: boolean
          updated_at: string
          vigente_desde: string
        }
        Insert: {
          anios_max?: number | null
          anios_min: number
          creado_por?: string | null
          created_at?: string
          dias_ley: number
          es_demo?: boolean
          fuente?: string
          id?: string
          nota?: string | null
          requiere_vb_juridico?: boolean
          updated_at?: string
          vigente_desde?: string
        }
        Update: {
          anios_max?: number | null
          anios_min?: number
          creado_por?: string | null
          created_at?: string
          dias_ley?: number
          es_demo?: boolean
          fuente?: string
          id?: string
          nota?: string | null
          requiere_vb_juridico?: boolean
          updated_at?: string
          vigente_desde?: string
        }
        Relationships: []
      }
      catalogo_valores: {
        Row: {
          activo: boolean
          clave: string
          creado_por: string | null
          created_at: string
          descripcion: string | null
          es_demo: boolean
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          clave: string
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          clave?: string
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      certificaciones: {
        Row: {
          colaborador_id: string
          costo: number | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          fecha_obtencion: string | null
          fecha_vencimiento: string | null
          folio: string | null
          id: string
          nombre: string
          organismo: string | null
          patrocinada_por_escala: boolean
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          costo?: number | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha_obtencion?: string | null
          fecha_vencimiento?: string | null
          folio?: string | null
          id?: string
          nombre: string
          organismo?: string | null
          patrocinada_por_escala?: boolean
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          costo?: number | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha_obtencion?: string | null
          fecha_vencimiento?: string | null
          folio?: string | null
          id?: string
          nombre?: string
          organismo?: string | null
          patrocinada_por_escala?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificaciones_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos_evaluacion: {
        Row: {
          creado_por: string | null
          created_at: string
          es_demo: boolean
          estatus: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      colaboradores: {
        Row: {
          area: string | null
          correo: string | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          estatus: Database["public"]["Enums"]["estatus_colaborador"]
          fecha_ingreso: string | null
          foto_url: string | null
          id: string
          lider_id: string | null
          nombre: string
          proyecto_actual_id: string | null
          puesto_id: string | null
          tipo_contrato: string | null
          ubicacion: Database["public"]["Enums"]["ubicacion_tipo"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          area?: string | null
          correo?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: Database["public"]["Enums"]["estatus_colaborador"]
          fecha_ingreso?: string | null
          foto_url?: string | null
          id?: string
          lider_id?: string | null
          nombre: string
          proyecto_actual_id?: string | null
          puesto_id?: string | null
          tipo_contrato?: string | null
          ubicacion?: Database["public"]["Enums"]["ubicacion_tipo"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          area?: string | null
          correo?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: Database["public"]["Enums"]["estatus_colaborador"]
          fecha_ingreso?: string | null
          foto_url?: string | null
          id?: string
          lider_id?: string | null
          nombre?: string
          proyecto_actual_id?: string | null
          puesto_id?: string | null
          tipo_contrato?: string | null
          ubicacion?: Database["public"]["Enums"]["ubicacion_tipo"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_lider_id_fkey"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_proyecto_actual_id_fkey"
            columns: ["proyecto_actual_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puestos"
            referencedColumns: ["id"]
          },
        ]
      }
      competencias: {
        Row: {
          creado_por: string | null
          created_at: string
          descripcion: string | null
          es_demo: boolean
          grupo: string | null
          id: string
          nombre: string
          orden: number
          updated_at: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          grupo?: string | null
          id?: string
          nombre: string
          orden?: number
          updated_at?: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          grupo?: string | null
          id?: string
          nombre?: string
          orden?: number
          updated_at?: string
        }
        Relationships: []
      }
      comportamientos: {
        Row: {
          creado_por: string | null
          created_at: string
          es_demo: boolean
          id: string
          nivel_competencia_id: string
          orden: number
          texto: string
          updated_at: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          nivel_competencia_id: string
          orden?: number
          texto: string
          updated_at?: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          nivel_competencia_id?: string
          orden?: number
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comportamientos_nivel_competencia_id_fkey"
            columns: ["nivel_competencia_id"]
            isOneToOne: false
            referencedRelation: "niveles_competencia"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          audiencia: string | null
          autor_id: string | null
          creado_por: string | null
          created_at: string
          cuerpo: string | null
          es_demo: boolean
          fecha_publicacion: string
          id: string
          lecturas: number
          titulo: string
          updated_at: string
        }
        Insert: {
          audiencia?: string | null
          autor_id?: string | null
          creado_por?: string | null
          created_at?: string
          cuerpo?: string | null
          es_demo?: boolean
          fecha_publicacion?: string
          id?: string
          lecturas?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          audiencia?: string | null
          autor_id?: string | null
          creado_por?: string | null
          created_at?: string
          cuerpo?: string | null
          es_demo?: boolean
          fecha_publicacion?: string
          id?: string
          lecturas?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          colaborador_id: string
          confidencial: boolean
          creado_por: string | null
          created_at: string
          es_demo: boolean
          id: string
          tipo: string
          updated_at: string
          url: string | null
          vigencia: string | null
        }
        Insert: {
          colaborador_id: string
          confidencial?: boolean
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          tipo: string
          updated_at?: string
          url?: string | null
          vigencia?: string | null
        }
        Update: {
          colaborador_id?: string
          confidencial?: boolean
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          tipo?: string
          updated_at?: string
          url?: string | null
          vigencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      encuesta_grupos_reporte: {
        Row: {
          congelado_en: string
          definicion: Json
          encuesta_id: string
        }
        Insert: {
          congelado_en?: string
          definicion: Json
          encuesta_id: string
        }
        Update: {
          congelado_en?: string
          definicion?: Json
          encuesta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encuesta_grupos_reporte_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: true
            referencedRelation: "encuestas"
            referencedColumns: ["id"]
          },
        ]
      }
      encuestas: {
        Row: {
          cerrada_en: string | null
          cerrada_por: string | null
          cobertura_objetivo: number | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          estatus: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          cerrada_en?: string | null
          cerrada_por?: string | null
          cobertura_objetivo?: number | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          cerrada_en?: string | null
          cerrada_por?: string | null
          cobertura_objetivo?: number | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entrevistas: {
        Row: {
          candidato_id: string
          creado_por: string | null
          created_at: string
          entrevistador_id: string | null
          es_demo: boolean
          estatus: string
          fecha: string | null
          id: string
          notas: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          candidato_id: string
          creado_por?: string | null
          created_at?: string
          entrevistador_id?: string | null
          es_demo?: boolean
          estatus?: string
          fecha?: string | null
          id?: string
          notas?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          candidato_id?: string
          creado_por?: string | null
          created_at?: string
          entrevistador_id?: string | null
          es_demo?: boolean
          estatus?: string
          fecha?: string | null
          id?: string
          notas?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrevistas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_entrevistador_id_fkey"
            columns: ["entrevistador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluacion_competencias: {
        Row: {
          competencia_id: string | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          evaluacion_id: string
          evidencia: string | null
          id: string
          nivel_observado: number | null
          updated_at: string
        }
        Insert: {
          competencia_id?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          evaluacion_id: string
          evidencia?: string | null
          id?: string
          nivel_observado?: number | null
          updated_at?: string
        }
        Update: {
          competencia_id?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          evaluacion_id?: string
          evidencia?: string | null
          id?: string
          nivel_observado?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_competencias_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluacion_competencias_evaluacion_id_fkey"
            columns: ["evaluacion_id"]
            isOneToOne: false
            referencedRelation: "evaluaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones: {
        Row: {
          ciclo_id: string | null
          colaborador_id: string | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          estatus: string
          evaluador_id: string | null
          id: string
          relacion: string | null
          updated_at: string
        }
        Insert: {
          ciclo_id?: string | null
          colaborador_id?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          evaluador_id?: string | null
          id?: string
          relacion?: string | null
          updated_at?: string
        }
        Update: {
          ciclo_id?: string | null
          colaborador_id?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          evaluador_id?: string | null
          id?: string
          relacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_evaluacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_evaluador_id_fkey"
            columns: ["evaluador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          creado_por: string | null
          created_at: string
          entidad: string | null
          entidad_id: string | null
          es_demo: boolean
          fecha: string
          id: string
          payload: Json
          procesado: boolean
          tipo: string | null
          updated_at: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          entidad?: string | null
          entidad_id?: string | null
          es_demo?: boolean
          fecha?: string
          id?: string
          payload?: Json
          procesado?: boolean
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          entidad?: string | null
          entidad_id?: string | null
          es_demo?: boolean
          fecha?: string
          id?: string
          payload?: Json
          procesado?: boolean
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fases_proceso: {
        Row: {
          activa: boolean
          creado_por: string | null
          created_at: string
          es_demo: boolean
          id: string
          nombre: string
          orden: number
          sla_dias: number | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          nombre: string
          orden?: number
          sla_dias?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          nombre?: string
          orden?: number
          sla_dias?: number | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      grupos_reporte: {
        Row: {
          activo: boolean
          areas: string[]
          creado_por: string | null
          created_at: string
          descripcion: string | null
          es_demo: boolean
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          areas?: string[]
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          areas?: string[]
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpis: {
        Row: {
          clave: string
          creado_por: string | null
          created_at: string
          es_demo: boolean
          fecha_corte: string | null
          formula_texto: string | null
          id: string
          linea_base: number | null
          meta: number | null
          nombre: string
          sentido: string
          unidad: string | null
          updated_at: string
        }
        Insert: {
          clave: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha_corte?: string | null
          formula_texto?: string | null
          id?: string
          linea_base?: number | null
          meta?: number | null
          nombre: string
          sentido?: string
          unidad?: string | null
          updated_at?: string
        }
        Update: {
          clave?: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha_corte?: string | null
          formula_texto?: string | null
          id?: string
          linea_base?: number | null
          meta?: number | null
          nombre?: string
          sentido?: string
          unidad?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mapeo_talento: {
        Row: {
          acuerdos: string | null
          casilla_9box: number | null
          ciclo_id: string | null
          colaborador_id: string | null
          creado_por: string | null
          created_at: string
          criticidad_puesto: string | null
          eje_desempeno: number | null
          eje_potencial: number | null
          es_demo: boolean
          id: string
          riesgo_salida: string | null
          updated_at: string
        }
        Insert: {
          acuerdos?: string | null
          casilla_9box?: number | null
          ciclo_id?: string | null
          colaborador_id?: string | null
          creado_por?: string | null
          created_at?: string
          criticidad_puesto?: string | null
          eje_desempeno?: number | null
          eje_potencial?: number | null
          es_demo?: boolean
          id?: string
          riesgo_salida?: string | null
          updated_at?: string
        }
        Update: {
          acuerdos?: string | null
          casilla_9box?: number | null
          ciclo_id?: string | null
          colaborador_id?: string | null
          creado_por?: string | null
          created_at?: string
          criticidad_puesto?: string | null
          eje_desempeno?: number | null
          eje_potencial?: number | null
          es_demo?: boolean
          id?: string
          riesgo_salida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapeo_talento_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_evaluacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapeo_talento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      medicion_efectividad: {
        Row: {
          autoevaluacion: boolean | null
          comentarios: string | null
          comportamiento_id: string | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          evaluacion_jefe: boolean | null
          fecha: string | null
          id: string
          prioridad_id: string
          updated_at: string
        }
        Insert: {
          autoevaluacion?: boolean | null
          comentarios?: string | null
          comportamiento_id?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          evaluacion_jefe?: boolean | null
          fecha?: string | null
          id?: string
          prioridad_id: string
          updated_at?: string
        }
        Update: {
          autoevaluacion?: boolean | null
          comentarios?: string | null
          comportamiento_id?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          evaluacion_jefe?: boolean | null
          fecha?: string | null
          id?: string
          prioridad_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicion_efectividad_comportamiento_id_fkey"
            columns: ["comportamiento_id"]
            isOneToOne: false
            referencedRelation: "comportamientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicion_efectividad_prioridad_id_fkey"
            columns: ["prioridad_id"]
            isOneToOne: false
            referencedRelation: "prioridades_desarrollo"
            referencedColumns: ["id"]
          },
        ]
      }
      mediciones_kpi: {
        Row: {
          calculado_en: string
          creado_por: string | null
          created_at: string
          es_demo: boolean
          id: string
          kpi_id: string
          periodo: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          calculado_en?: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          kpi_id: string
          periodo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          calculado_en?: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          id?: string
          kpi_id?: string
          periodo?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mediciones_kpi_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpis"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_candidato: {
        Row: {
          candidato_id: string
          creado_por: string | null
          created_at: string
          dias_en_fase: number | null
          es_demo: boolean
          fase_destino: string | null
          fase_origen: string | null
          fecha: string
          id: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          candidato_id: string
          creado_por?: string | null
          created_at?: string
          dias_en_fase?: number | null
          es_demo?: boolean
          fase_destino?: string | null
          fase_origen?: string | null
          fecha?: string
          id?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          candidato_id?: string
          creado_por?: string | null
          created_at?: string
          dias_en_fase?: number | null
          es_demo?: boolean
          fase_destino?: string | null
          fase_origen?: string | null
          fecha?: string
          id?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_candidato_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      niveles_competencia: {
        Row: {
          competencia_id: string
          creado_por: string | null
          created_at: string
          descripcion: string | null
          es_demo: boolean
          etiqueta: string | null
          id: string
          nivel: number
          resumen: string | null
          updated_at: string
        }
        Insert: {
          competencia_id: string
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          etiqueta?: string | null
          id?: string
          nivel: number
          resumen?: string | null
          updated_at?: string
        }
        Update: {
          competencia_id?: string
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          etiqueta?: string | null
          id?: string
          nivel?: number
          resumen?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niveles_competencia_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      objetivos: {
        Row: {
          ciclo_id: string | null
          colaborador_id: string | null
          creado_por: string | null
          created_at: string
          descripcion: string | null
          es_demo: boolean
          estatus: string
          id: string
          meta: number | null
          peso: number | null
          real: number | null
          tipo: string | null
          unidad: string | null
          updated_at: string
        }
        Insert: {
          ciclo_id?: string | null
          colaborador_id?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          estatus?: string
          id?: string
          meta?: number | null
          peso?: number | null
          real?: number | null
          tipo?: string | null
          unidad?: string | null
          updated_at?: string
        }
        Update: {
          ciclo_id?: string | null
          colaborador_id?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          estatus?: string
          id?: string
          meta?: number | null
          peso?: number | null
          real?: number | null
          tipo?: string | null
          unidad?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objetivos_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos_evaluacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "objetivos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas: {
        Row: {
          candidato_id: string
          creado_por: string | null
          created_at: string
          es_demo: boolean
          estatus: string
          fecha_envio: string | null
          fecha_respuesta: string | null
          id: string
          prestaciones: string | null
          sueldo: number | null
          updated_at: string
        }
        Insert: {
          candidato_id: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          id?: string
          prestaciones?: string | null
          sueldo?: number | null
          updated_at?: string
        }
        Update: {
          candidato_id?: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          id?: string
          prestaciones?: string | null
          sueldo?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ofertas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros_bienestar: {
        Row: {
          actualizado_por: string | null
          created_at: string
          id: number
          umbral_agregacion: number
          updated_at: string
        }
        Insert: {
          actualizado_por?: string | null
          created_at?: string
          id?: number
          umbral_agregacion?: number
          updated_at?: string
        }
        Update: {
          actualizado_por?: string | null
          created_at?: string
          id?: number
          umbral_agregacion?: number
          updated_at?: string
        }
        Relationships: []
      }
      prioridades_desarrollo: {
        Row: {
          agenda_id: string
          competencia_id: string | null
          creado_por: string | null
          created_at: string
          descripcion: string | null
          dimension: string | null
          es_demo: boolean
          id: string
          nivel_actual: number | null
          nivel_meta: number | null
          updated_at: string
        }
        Insert: {
          agenda_id: string
          competencia_id?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          dimension?: string | null
          es_demo?: boolean
          id?: string
          nivel_actual?: number | null
          nivel_meta?: number | null
          updated_at?: string
        }
        Update: {
          agenda_id?: string
          competencia_id?: string | null
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          dimension?: string | null
          es_demo?: boolean
          id?: string
          nivel_actual?: number | null
          nivel_meta?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prioridades_desarrollo_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agendas_desarrollo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prioridades_desarrollo_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          colaborador_id: string | null
          correo: string | null
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          colaborador_id?: string | null
          correo?: string | null
          created_at?: string
          id: string
          nombre?: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string | null
          correo?: string | null
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_colaborador_fk"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos: {
        Row: {
          ciudad: string | null
          cliente: string | null
          creado_por: string | null
          created_at: string
          director_id: string | null
          es_demo: boolean
          estatus: string
          fecha_fin_plan: string | null
          fecha_inicio: string | null
          id: string
          id_externo_acc: string | null
          nombre: string
          updated_at: string
        }
        Insert: {
          ciudad?: string | null
          cliente?: string | null
          creado_por?: string | null
          created_at?: string
          director_id?: string | null
          es_demo?: boolean
          estatus?: string
          fecha_fin_plan?: string | null
          fecha_inicio?: string | null
          id?: string
          id_externo_acc?: string | null
          nombre: string
          updated_at?: string
        }
        Update: {
          ciudad?: string | null
          cliente?: string | null
          creado_por?: string | null
          created_at?: string
          director_id?: string | null
          es_demo?: boolean
          estatus?: string
          fecha_fin_plan?: string | null
          fecha_inicio?: string | null
          id?: string
          id_externo_acc?: string | null
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_director_fk"
            columns: ["director_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      puestos: {
        Row: {
          area: string | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          familia: string | null
          id: string
          nivel_organizacional: string | null
          nombre: string
          perfil_competencias: Json
          updated_at: string
        }
        Insert: {
          area?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          familia?: string | null
          id?: string
          nivel_organizacional?: string | null
          nombre: string
          perfil_competencias?: Json
          updated_at?: string
        }
        Update: {
          area?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          familia?: string | null
          id?: string
          nivel_organizacional?: string | null
          nombre?: string
          perfil_competencias?: Json
          updated_at?: string
        }
        Relationships: []
      }
      pulsos_animo: {
        Row: {
          colaborador_id: string
          comentario_opcional: string | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          fecha: string
          id: string
          proyecto_id: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          colaborador_id: string
          comentario_opcional?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha?: string
          id?: string
          proyecto_id?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          colaborador_id?: string
          comentario_opcional?: string | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha?: string
          id?: string
          proyecto_id?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pulsos_animo_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pulsos_animo_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      reconocimientos: {
        Row: {
          creado_por: string | null
          created_at: string
          de_id: string | null
          es_demo: boolean
          fecha: string
          id: string
          mensaje: string | null
          para_id: string | null
          publico: boolean
          updated_at: string
          valor_asociado: string | null
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          de_id?: string | null
          es_demo?: boolean
          fecha?: string
          id?: string
          mensaje?: string | null
          para_id?: string | null
          publico?: boolean
          updated_at?: string
          valor_asociado?: string | null
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          de_id?: string | null
          es_demo?: boolean
          fecha?: string
          id?: string
          mensaje?: string | null
          para_id?: string | null
          publico?: boolean
          updated_at?: string
          valor_asociado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reconocimientos_de_id_fkey"
            columns: ["de_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconocimientos_para_id_fkey"
            columns: ["para_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_jornada: {
        Row: {
          colaborador_id: string
          creado_por: string | null
          created_at: string
          es_demo: boolean
          fecha: string | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          origen: string | null
          precision_m: number | null
          proyecto_id: string | null
          tipo_registro: string | null
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          origen?: string | null
          precision_m?: number | null
          proyecto_id?: string | null
          tipo_registro?: string | null
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha?: string | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          origen?: string | null
          precision_m?: number | null
          proyecto_id?: string | null
          tipo_registro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_jornada_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_jornada_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      respuestas_encuesta: {
        Row: {
          area: string | null
          colaborador_hash: string | null
          creado_por: string | null
          created_at: string
          encuesta_id: string
          es_demo: boolean
          id: string
          reactivo_id: string | null
          ubicacion: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          area?: string | null
          colaborador_hash?: string | null
          creado_por?: string | null
          created_at?: string
          encuesta_id: string
          es_demo?: boolean
          id?: string
          reactivo_id?: string | null
          ubicacion?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          area?: string | null
          colaborador_hash?: string | null
          creado_por?: string | null
          created_at?: string
          encuesta_id?: string
          es_demo?: boolean
          id?: string
          reactivo_id?: string | null
          ubicacion?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "respuestas_encuesta_encuesta_id_fkey"
            columns: ["encuesta_id"]
            isOneToOne: false
            referencedRelation: "encuestas"
            referencedColumns: ["id"]
          },
        ]
      }
      sal_bienestar: {
        Row: {
          created_at: string
          id: number
          sal: string
        }
        Insert: {
          created_at?: string
          id?: number
          sal: string
        }
        Update: {
          created_at?: string
          id?: number
          sal?: string
        }
        Relationships: []
      }
      saldos_vacaciones: {
        Row: {
          anio_servicio: number | null
          colaborador_id: string
          creado_por: string | null
          created_at: string
          dias_adicionales: number
          dias_disponibles: number
          dias_ley: number
          dias_tomados: number
          es_demo: boolean
          id: string
          updated_at: string
        }
        Insert: {
          anio_servicio?: number | null
          colaborador_id: string
          creado_por?: string | null
          created_at?: string
          dias_adicionales?: number
          dias_disponibles?: number
          dias_ley?: number
          dias_tomados?: number
          es_demo?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          anio_servicio?: number | null
          colaborador_id?: string
          creado_por?: string | null
          created_at?: string
          dias_adicionales?: number
          dias_disponibles?: number
          dias_ley?: number
          dias_tomados?: number
          es_demo?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saldos_vacaciones_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      scorecards: {
        Row: {
          calificacion: number | null
          competencia_id: string | null
          creado_por: string | null
          created_at: string
          entrevista_id: string
          es_demo: boolean
          evidencia_star: string | null
          id: string
          recomendacion: string | null
          updated_at: string
        }
        Insert: {
          calificacion?: number | null
          competencia_id?: string | null
          creado_por?: string | null
          created_at?: string
          entrevista_id: string
          es_demo?: boolean
          evidencia_star?: string | null
          id?: string
          recomendacion?: string | null
          updated_at?: string
        }
        Update: {
          calificacion?: number | null
          competencia_id?: string | null
          creado_por?: string | null
          created_at?: string
          entrevista_id?: string
          es_demo?: boolean
          evidencia_star?: string | null
          id?: string
          recomendacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scorecards_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scorecards_entrevista_id_fkey"
            columns: ["entrevista_id"]
            isOneToOne: false
            referencedRelation: "entrevistas"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_seguimiento: {
        Row: {
          acuerdos: string | null
          agenda_id: string
          creado_por: string | null
          created_at: string
          es_demo: boolean
          fecha: string | null
          id: string
          participantes: string[] | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          acuerdos?: string | null
          agenda_id: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha?: string | null
          id?: string
          participantes?: string[] | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          acuerdos?: string | null
          agenda_id?: string
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          fecha?: string | null
          id?: string
          participantes?: string[] | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_seguimiento_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "agendas_desarrollo"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes: {
        Row: {
          aprobador_id: string | null
          colaborador_id: string
          creado_por: string | null
          created_at: string
          dias: number | null
          es_demo: boolean
          estatus: string
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_resolucion: string | null
          fecha_solicitud: string
          horas_ciclo: number | null
          id: string
          motivo: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          aprobador_id?: string | null
          colaborador_id: string
          creado_por?: string | null
          created_at?: string
          dias?: number | null
          es_demo?: boolean
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          horas_ciclo?: number | null
          id?: string
          motivo?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          aprobador_id?: string | null
          colaborador_id?: string
          creado_por?: string | null
          created_at?: string
          dias?: number | null
          es_demo?: boolean
          estatus?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          horas_ciclo?: number | null
          id?: string
          motivo?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_aprobador_id_fkey"
            columns: ["aprobador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      supuestos_financieros: {
        Row: {
          actualizado_por: string | null
          clave: string
          creado_por: string | null
          created_at: string
          descripcion: string | null
          es_demo: boolean
          fecha_actualizacion: string | null
          fuente: string | null
          id: string
          unidad: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          actualizado_por?: string | null
          clave: string
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          fecha_actualizacion?: string | null
          fuente?: string | null
          id?: string
          unidad?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          actualizado_por?: string | null
          clave?: string
          creado_por?: string | null
          created_at?: string
          descripcion?: string | null
          es_demo?: boolean
          fecha_actualizacion?: string | null
          fuente?: string | null
          id?: string
          unidad?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          user_id?: string
        }
        Relationships: []
      }
      vacantes: {
        Row: {
          costo_vacante_dia: number | null
          creado_por: string | null
          created_at: string
          es_demo: boolean
          estatus: string
          fecha_apertura: string | null
          fecha_cierre_real: string | null
          fecha_meta_cobertura: string | null
          hiring_manager_id: string | null
          id: string
          motivo: string | null
          proyecto_id: string | null
          puesto_id: string | null
          salario_max: number | null
          salario_min: number | null
          updated_at: string
        }
        Insert: {
          costo_vacante_dia?: number | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_apertura?: string | null
          fecha_cierre_real?: string | null
          fecha_meta_cobertura?: string | null
          hiring_manager_id?: string | null
          id?: string
          motivo?: string | null
          proyecto_id?: string | null
          puesto_id?: string | null
          salario_max?: number | null
          salario_min?: number | null
          updated_at?: string
        }
        Update: {
          costo_vacante_dia?: number | null
          creado_por?: string | null
          created_at?: string
          es_demo?: boolean
          estatus?: string
          fecha_apertura?: string | null
          fecha_cierre_real?: string | null
          fecha_meta_cobertura?: string | null
          hiring_manager_id?: string | null
          id?: string
          motivo?: string | null
          proyecto_id?: string | null
          puesto_id?: string | null
          salario_max?: number | null
          salario_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacantes_hiring_manager_id_fkey"
            columns: ["hiring_manager_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacantes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacantes_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puestos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agenda_de_prioridad: { Args: { _prioridad: string }; Returns: string }
      animo_comentarios: {
        Args: { _desde: string; _hasta: string }
        Returns: {
          comentario: string
          valor: number
        }[]
      }
      animo_equipo: {
        Args: { _desde: string; _hasta: string }
        Returns: {
          personas: number
          promedio: number
          suprimido: boolean
        }[]
      }
      animo_firma: {
        Args: { _desde: string; _hasta: string }
        Returns: {
          personas: number
          promedio: number
          registros: number
          suprimido: boolean
        }[]
      }
      animo_serie_firma: {
        Args: { _desde: string; _hasta: string }
        Returns: {
          personas: number
          promedio: number
          semana: string
        }[]
      }
      aplicar_saldo_vacaciones: {
        Args: { _colaborador: string; _dias: number }
        Returns: undefined
      }
      clima_enps: {
        Args: { _corte?: string; _encuesta: string }
        Returns: {
          detractores: number
          enps: number
          grupo: string
          pasivos: number
          personas: number
          promotores: number
          suprimido: boolean
        }[]
      }
      clima_grupos: {
        Args: { _corte?: string; _encuesta: string }
        Returns: {
          grupo: string
          personas: number
          suprimido: boolean
        }[]
      }
      clima_reactivos: {
        Args: { _corte?: string; _encuesta: string }
        Returns: {
          grupo: string
          personas: number
          promedio: number
          reactivo_id: string
          respuestas: number
        }[]
      }
      definicion_grupos_actual: { Args: never; Returns: Json }
      definicion_grupos_encuesta: {
        Args: { _encuesta: string }
        Returns: {
          congelado_en: string
          difiere: boolean
        }[]
      }
      encuesta_avance: { Args: { _encuesta: string }; Returns: number }
      es: {
        Args: { _rol: Database["public"]["Enums"]["rol_usuario"] }
        Returns: boolean
      }
      hash_respuesta: {
        Args: { _colab: string; _encuesta: string }
        Returns: string
      }
      lidera: { Args: { _colab: string }; Returns: boolean }
      listar_usuarios: {
        Args: never
        Returns: {
          colaborador_id: string
          correo: string
          id: string
          nombre: string
          roles: Database["public"]["Enums"]["rol_usuario"][]
        }[]
      }
      mapa_grupos_encuesta: {
        Args: { _encuesta: string }
        Returns: {
          area: string
          grupo: string
        }[]
      }
      mi_colaborador_id: { Args: never; Returns: string }
      mis_roles: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"][]
      }
      participacion_reconocimientos: {
        Args: { _desde: string; _hasta: string }
        Returns: {
          personas: number
          plantilla: number
        }[]
      }
      puede_editar_agenda: { Args: { _agenda: string }; Returns: boolean }
      puede_ver_agenda: { Args: { _agenda: string }; Returns: boolean }
      responder_encuesta: {
        Args: { _encuesta: string; _respuestas: Json }
        Returns: undefined
      }
      tiene_rol: {
        Args: {
          _rol: Database["public"]["Enums"]["rol_usuario"]
          _user_id: string
        }
        Returns: boolean
      }
      umbral_agregacion: { Args: never; Returns: number }
      ya_respondi: { Args: { _encuesta: string }; Returns: boolean }
    }
    Enums: {
      estatus_colaborador: "activo" | "baja" | "licencia"
      rol_usuario:
        | "direccion_talento"
        | "direccion_general"
        | "lider_proyecto"
        | "reclutamiento"
        | "colaborador"
        | "finanzas_auditoria"
        | "ti_sistema"
      ubicacion_tipo: "corporativo" | "campo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estatus_colaborador: ["activo", "baja", "licencia"],
      rol_usuario: [
        "direccion_talento",
        "direccion_general",
        "lider_proyecto",
        "reclutamiento",
        "colaborador",
        "finanzas_auditoria",
        "ti_sistema",
      ],
      ubicacion_tipo: ["corporativo", "campo"],
    },
  },
} as const
